<?php
require_once 'db.php';

$db_url = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? '');
$parsed = parse_url($db_url);
$scheme = $parsed['scheme'] ?? 'pgsql';

echo "Testing connection to Database ($scheme)...\n";

try {
    // 1. Check connection
    $stmt = $pdo->query("SELECT version()");
    $version = $stmt->fetchColumn();
    echo "Connected successfully to: " . $version . "\n";

    // 2. Check if users table exists
    if ($scheme === 'mysql') {
        $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'");
        $tableExists = $stmt->fetchColumn() > 0;
    } else {
        $stmt = $pdo->query("SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE  table_schema = 'public'
            AND    table_name   = 'users'
        )");
        $tableExists = $stmt->fetchColumn();
    }

    if (!$tableExists) {
        echo "Users table does not exist. Applying schema...\n";
        $schemaFile = ($scheme === 'mysql') ? 'mysql_schema.sql' : 'neon_schema.sql';
        $sql = file_get_contents($schemaFile);
        $pdo->exec($sql);
        echo "Schema applied successfully.\n";
    } else {
        echo "Users table exists.\n";
    }

    // 3. Ensure admin user exists
    $email = 'admin@admin.com';
    $username = 'Administrator';
    $password = password_hash('admin123', PASSWORD_DEFAULT);
    $role = 'admin';

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $admin = $stmt->fetch();

    if (!$admin) {
        echo "Admin user not found. Seeding admin...\n";
        $stmt = $pdo->prepare("INSERT INTO users (email, username, password, role) VALUES (?, ?, ?, ?)");
        $stmt->execute([$email, $username, $password, $role]);
        echo "Admin user seeded successfully (admin@admin.com / admin123).\n";
    } else {
        echo "Admin user already exists.\n";
    }

    // 4. Check services table
    $stmt = $pdo->query("SELECT COUNT(*) FROM services");
    $count = $stmt->fetchColumn();
    echo "Current product count: " . $count . "\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
