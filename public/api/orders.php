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
        // Fetch all orders with their items
        try {
            $stmt = $pdo->query('SELECT * FROM room_orders ORDER BY created_at DESC');
            $orders = $stmt->fetchAll();
            
            foreach ($orders as &$order) {
                $itemStmt = $pdo->prepare('
                    SELECT oi.*, s.name_en, s.image_url 
                    FROM order_items oi 
                    JOIN services s ON oi.service_id = s.id 
                    WHERE oi.order_id = ?
                ');
                $itemStmt->execute([$order['id']]);
                $order['items'] = $itemStmt->fetchAll();
            }
            
            echo json_encode($orders);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch orders: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        // Create new order
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['roomNumber']) || !isset($data['items']) || empty($data['items'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid order data. Room number and items are required.']);
            exit;
        }

        try {
            $pdo->beginTransaction();
            
            $total_price = 0;
            foreach ($data['items'] as $item) {
                $total_price += $item['price'] * $item['quantity'];
            }

            $stmt = $pdo->prepare('INSERT INTO room_orders (room_number, total_price) VALUES (?, ?)');
            $stmt->execute([$data['roomNumber'], $total_price]);
            $orderId = $pdo->lastInsertId();

            $itemStmt = $pdo->prepare('INSERT INTO order_items (order_id, service_id, quantity, price) VALUES (?, ?, ?, ?)');
            foreach ($data['items'] as $item) {
                $itemStmt->execute([$orderId, $item['id'], $item['quantity'], $item['price']]);
            }

            $pdo->commit();
            
            echo json_encode(['success' => true, 'order_id' => $orderId]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create order: ' . $e->getMessage()]);
        }
        break;

    case 'PATCH':
        // Update order status
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['id']) || !isset($data['status'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing order ID or status.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare('UPDATE room_orders SET status = ? WHERE id = ?');
            $stmt->execute([$data['status'], $data['id']]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update order status: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>
