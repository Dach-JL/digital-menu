<?php
require_once 'db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_GET['user_id'] ?? null;
    if ($user_id) {
        // --- FIX: Use the new multilingual column names ---
        $stmt = $pdo->prepare('
            SELECT 
                f.id, 
                f.service_id, 
                s.name_en, 
                s.name_am, 
                s.name_om,
                s.description_en,
                s.description_am,
                s.description_om,
                s.type, 
                s.price, 
                s.image_url 
            FROM favorites f 
            JOIN services s ON f.service_id = s.id 
            WHERE f.user_id = ?
        ');
        $stmt->execute([$user_id]);
        echo json_encode($stmt->fetchAll());
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Missing user_id']);
    }
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare('INSERT INTO favorites (user_id, service_id) VALUES (?, ?)');
    try {
        $stmt->execute([$data['user_id'], $data['service_id']]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(409);
        echo json_encode(['error' => 'Already favorited']);
    }
    exit;
}

if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $stmt = $pdo->prepare('DELETE FROM favorites WHERE user_id = ? AND service_id = ?');
    $stmt->execute([$data['user_id'], $data['service_id']]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);