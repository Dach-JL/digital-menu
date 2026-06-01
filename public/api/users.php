<?php
require_once 'db.php';
// Allow CORS for development
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// ========================
// LOGIN
// ========================
if ($action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing fields']);
        exit;
    }
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user && password_verify($password, $user['password'])) {
        unset($user['password']); // Don't send password hash to client
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
    exit;
}

// ========================
// REGISTER (regular users only)
// ========================
if ($action === 'register') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    if (!$email || !$username || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    
    // All registrations are regular users. Admins are created by the General Admin.
    $role = 'user';

    try {
        $stmt = $pdo->prepare('INSERT INTO users (email, username, password, role) VALUES (?, ?, ?, ?)');
        $stmt->execute([$email, $username, $hash, $role]);
        $userId = $pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $userId,
                'email' => $email,
                'username' => $username,
                'role' => $role
            ]
        ]);

    } catch (PDOException $e) {
        http_response_code(409);
        if ($e->getCode() == 23505) {
            echo json_encode(['error' => 'Email or username already exists.']);
        } else {
            echo json_encode(['error' => 'Database error during registration: ' . $e->getMessage()]);
        }
    }
    exit;
}

// ========================
// LIST ADMINS (General Admin only)
// ========================
if ($action === 'list_admins') {
    try {
        $stmt = $pdo->query("SELECT id, email, username, role, created_at FROM users WHERE role IN ('admin', 'admin_room', 'admin_food', 'admin_waiter') ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ========================
// CREATE ADMIN (General Admin only)
// ========================
if ($action === 'create_admin') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? '';

    if (!$email || !$username || !$password || !$role) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }

    // Validate role
    $valid_roles = ['admin', 'admin_room', 'admin_food', 'admin_waiter'];
    if (!in_array($role, $valid_roles)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid admin role']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    try {
        $stmt = $pdo->prepare('INSERT INTO users (email, username, password, role) VALUES (?, ?, ?, ?)');
        $stmt->execute([$email, $username, $hash, $role]);
        $userId = $pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'admin' => [
                'id' => $userId,
                'email' => $email,
                'username' => $username,
                'role' => $role
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(409);
        if ($e->getCode() == 23505) {
            echo json_encode(['error' => 'Email or username already exists.']);
        } else {
            echo json_encode(['error' => 'Failed to create admin: ' . $e->getMessage()]);
        }
    }
    exit;
}

// ========================
// DELETE ADMIN (General Admin only)
// ========================
if ($action === 'delete_admin') {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing admin ID']);
        exit;
    }

    try {
        // Prevent deleting yourself or the last general admin
        $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $targetUser = $stmt->fetch();

        if (!$targetUser) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit;
        }

        $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete admin: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Invalid action']);