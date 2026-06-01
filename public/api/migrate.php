<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$db_url = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? '');
$parsed = parse_url($db_url);
$scheme = $parsed['scheme'] ?? 'pgsql';

$schema_clause = ($scheme === 'mysql') ? "table_schema = DATABASE()" : "table_schema = 'public'";
$results = [];

// Migration 1: Add is_available column to services
try {
    $check = $pdo->query("SELECT column_name FROM information_schema.columns WHERE $schema_clause AND table_name = 'services' AND column_name = 'is_available'");
    if ($check->rowCount() === 0) {
        $pdo->exec("ALTER TABLE services ADD COLUMN is_available BOOLEAN DEFAULT TRUE");
        $results[] = "Added is_available column to services";
    } else {
        $results[] = "is_available column already exists";
    }
} catch (PDOException $e) {
    $results[] = "Error adding is_available: " . $e->getMessage();
}

// Migration 2: Add room_number column to services
try {
    $check = $pdo->query("SELECT column_name FROM information_schema.columns WHERE $schema_clause AND table_name = 'services' AND column_name = 'room_number'");
    if ($check->rowCount() === 0) {
        $pdo->exec("ALTER TABLE services ADD COLUMN room_number VARCHAR(50)");
        $results[] = "Added room_number column to services";
    } else {
        $results[] = "room_number column already exists";
    }
} catch (PDOException $e) {
    $results[] = "Error adding room_number: " . $e->getMessage();
}

// Migration 3: Add subcategory column to services
try {
    $check = $pdo->query("SELECT column_name FROM information_schema.columns WHERE $schema_clause AND table_name = 'services' AND column_name = 'subcategory'");
    if ($check->rowCount() === 0) {
        $pdo->exec("ALTER TABLE services ADD COLUMN subcategory VARCHAR(255)");
        $results[] = "Added subcategory column to services";
    } else {
        $results[] = "subcategory column already exists";
    }
} catch (PDOException $e) {
    $results[] = "Error adding subcategory: " . $e->getMessage();
}

echo json_encode(['success' => true, 'results' => $results]);
