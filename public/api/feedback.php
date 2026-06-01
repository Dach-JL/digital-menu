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
    // --- FIX: Use the new name_en column ---
    $query = '
        SELECT 
            f.id, 
            f.comment, 
            f.rating, 
            f.created_at, 
            f.category,
            u.username, 
            s.name_en AS service_name
        FROM 
            feedback f
        LEFT JOIN 
            users u ON f.user_id = u.id
        LEFT JOIN 
            services s ON f.service_id = s.id
        ORDER BY 
            f.created_at DESC
    ';
    $stmt = $pdo->query($query);
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $user_id = $data['user_id'] ?? null;
    $service_id = $data['service_id'] ?? null;
    $category = $data['category'] ?? null;
    $comment = $data['comment'] ?? null;
    $rating = $data['rating'] ?? null;

    if (!$category || !$comment || !$rating) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields: category, comment, and rating are required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('INSERT INTO feedback (user_id, service_id, category, comment, rating) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$user_id, $service_id, $category, $comment, $rating]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);