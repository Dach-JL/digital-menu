<?php
require_once 'db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

function is_admin() {
    return true; 
}

$method = $_SERVER['REQUEST_METHOD'];

// Parse JSON body if present and merge into $_POST
$input_content = file_get_contents('php://input');
$json_data = json_decode($input_content, true);
if (is_array($json_data)) {
    $_POST = array_merge($_POST, $json_data);
}

switch ($method) {
    case 'GET':
        $isAdmin = isset($_GET['admin']) && $_GET['admin'] == '1';
        
        if ($isAdmin) {
            // Admin view: return ALL services including unavailable, with is_available field
            $stmt = $pdo->query('SELECT id, name_en, name_am, name_om, description_en, description_am, description_om, type, subcategory, price, image_url, ingredients, macro_kcal, macro_protein, macro_fat, macro_carbs, beds, max_guests, room_number, is_available, created_at FROM services ORDER BY created_at DESC');
        } else {
            // User view: only return available services
            $stmt = $pdo->query('SELECT id, name_en, name_am, name_om, description_en, description_am, description_om, type, subcategory, price, image_url, ingredients, macro_kcal, macro_protein, macro_fat, macro_carbs, beds, max_guests, room_number, created_at FROM services WHERE is_available = TRUE ORDER BY created_at DESC');
        }
        
        $results = $stmt->fetchAll();
        
        // Cast is_available to boolean for admin responses
        if ($isAdmin) {
            foreach ($results as &$row) {
                $row['is_available'] = (bool)$row['is_available'];
            }
        }
        
        echo json_encode($results);
        break;
    
    case 'PATCH':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing ID']);
            exit;
        }

        // Allow updating translation fields AND is_available toggle
        $allowed_fields = ['name_am', 'name_om', 'description_am', 'description_om', 'is_available'];
        $update_parts = [];
        $params = [];

        foreach ($data as $key => $value) {
            if (in_array($key, $allowed_fields)) {
                $update_parts[] = "$key = ?";
                // Cast is_available to proper boolean for postgres
                if ($key === 'is_available') {
                    $params[] = $value ? 1 : 0;
                } else {
                    $params[] = $value;
                }
            }
        }

        if (empty($update_parts)) {
            http_response_code(400);
            echo json_encode(['error' => 'No valid fields provided']);
            exit;
        }

        $params[] = $id;
        $sql = "UPDATE services SET " . implode(', ', $update_parts) . " WHERE id = ?";
        
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'POST':
        if (!is_admin()) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Administrator access required.']);
            exit;
        }

        $is_update = isset($_POST['id']) && !empty($_POST['id']);

        // Collect all language data from the form
        $name_en = $_POST['name_en'] ?? '';
        $description_en = $_POST['description_en'] ?? '';
        $name_am = $_POST['name_am'] ?? '';
        $description_am = $_POST['description_am'] ?? '';
        $name_om = $_POST['name_om'] ?? '';
        $description_om = $_POST['description_om'] ?? '';
        
        $type = $_POST['type'] ?? '';
        $subcategory = $_POST['subcategory'] ?? null;
        $price = $_POST['price'] ?? '';
        $image_url = $_POST['image_url'] ?? '';

        // New fields: ingredients (JSON string) and macros
        $ingredients = $_POST['ingredients'] ?? null;
        $macro_kcal = $_POST['macro_kcal'] ?? null;
        $macro_protein = $_POST['macro_protein'] ?? null;
        $macro_fat = $_POST['macro_fat'] ?? null;
        $macro_carbs = $_POST['macro_carbs'] ?? null;
        $beds = $_POST['beds'] ?? null;
        $max_guests = $_POST['max_guests'] ?? null;
        $room_number = $_POST['room_number'] ?? null;

        // Convert empty strings to null for numeric fields
        if ($macro_kcal === '') $macro_kcal = null;
        if ($macro_protein === '') $macro_protein = null;
        if ($macro_fat === '') $macro_fat = null;
        if ($macro_carbs === '') $macro_carbs = null;
        if ($beds === '') $beds = null;
        if ($max_guests === '') $max_guests = null;

        if ($is_update) {
            // ----- UPDATE LOGIC -----
            $id = $_POST['id'];
            
            // Fetch existing image url
            $stmt = $pdo->prepare('SELECT image_url FROM services WHERE id = ?');
            $stmt->execute([$id]);
            $current_service = $stmt->fetch();
            $old_image_url = $current_service['image_url'];

            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                if ($old_image_url && file_exists("../" . $old_image_url)) {
                     unlink("../" . $old_image_url);
                }
                $uploadDir = '../uploads/';
                $fileName = uniqid() . '-' . basename($_FILES['image']['name']);
                $targetPath = $uploadDir . $fileName;
                if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
                    $image_url = 'uploads/' . $fileName;
                }
            } else if (empty($image_url)) {
                $image_url = $old_image_url;
            }
            
            try {
                $stmt = $pdo->prepare('UPDATE services SET name_en=?, description_en=?, name_am=?, description_am=?, name_om=?, description_om=?, type=?, subcategory=?, price=?, image_url=?, ingredients=?, macro_kcal=?, macro_protein=?, macro_fat=?, macro_carbs=?, beds=?, max_guests=?, room_number=? WHERE id=?');
                $stmt->execute([$name_en, $description_en, $name_am, $description_am, $name_om, $description_om, $type, $subcategory, $price, $image_url, $ingredients, $macro_kcal, $macro_protein, $macro_fat, $macro_carbs, $beds, $max_guests, $room_number, $id]);
                echo json_encode(['success' => true]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to update service: ' . $e->getMessage()]);
            }

        } else {
            // ----- CREATE LOGIC -----
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = '../uploads/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
                $fileName = uniqid() . '-' . basename($_FILES['image']['name']);
                $targetPath = $uploadDir . $fileName;
                if (move_uploaded_file($_FILES['image']['tmp_name'], $targetPath)) {
                    $image_url = 'uploads/' . $fileName;
                }
            }

            try {
                $stmt = $pdo->prepare('INSERT INTO services (name_en, description_en, name_am, description_am, name_om, description_om, type, subcategory, price, image_url, ingredients, macro_kcal, macro_protein, macro_fat, macro_carbs, beds, max_guests, room_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([$name_en, $description_en, $name_am, $description_am, $name_om, $description_om, $type, $subcategory, $price, $image_url, $ingredients, $macro_kcal, $macro_protein, $macro_fat, $macro_carbs, $beds, $max_guests, $room_number]);
                $newServiceId = $pdo->lastInsertId();
                $selectStmt = $pdo->prepare('SELECT * FROM services WHERE id = ?');
                $selectStmt->execute([$newServiceId]);
                $newService = $selectStmt->fetch();
                echo json_encode(['success' => true, 'service' => $newService]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to add service: ' . $e->getMessage()]);
            }
        }
        break;

    case 'DELETE':
        if (!is_admin()) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden: Administrator access required.']);
            exit;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing service ID for deletion.']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT image_url FROM services WHERE id = ?');
        $stmt->execute([$id]);
        $service = $stmt->fetch();
        
        if ($service && !empty($service['image_url']) && file_exists('../' . $service['image_url'])) {
            unlink('../' . $service['image_url']);
        }

        try {
            // Delete related order items first to prevent foreign key constraint violations
            $stmt = $pdo->prepare('DELETE FROM order_items WHERE service_id=?');
            $stmt->execute([$id]);
            
            $stmt = $pdo->prepare('DELETE FROM services WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete service: ' . $e->getMessage()]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}