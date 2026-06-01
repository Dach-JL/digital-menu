<?php
require_once 'db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Fetch all waiter calls
        try {
            $stmt = $pdo->query('SELECT * FROM waiter_calls ORDER BY created_at DESC');
            $calls = $stmt->fetchAll();
            echo json_encode($calls);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch waiter calls: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        // Create new waiter call
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['roomNumber'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Room number is required.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('INSERT INTO waiter_calls (room_number) VALUES (?)');
            $stmt->execute([$data['roomNumber']]);
            $callId = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'call_id' => $callId]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create waiter call: ' . $e->getMessage()]);
        }
        break;

    case 'PATCH':
        // Update waiter call status
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['id']) || !isset($data['status'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing call ID or status.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('UPDATE waiter_calls SET status = ? WHERE id = ?');
            $stmt->execute([$data['status'], $data['id']]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update waiter call status: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>
