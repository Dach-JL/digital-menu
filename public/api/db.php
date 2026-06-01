<?php
// Neon Postgres Database configuration
// Set your Neon connection string in the DATABASE_URL environment variable
// or directly in the $database_url variable below.

// Load .env file if it exists (for local development)
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

// Parse the connection URL (supports both mysql:// and postgres:// / pgsql://)
$db_url = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? '');
if (empty($db_url)) {
    http_response_code(500);
    echo json_encode(['error' => 'DATABASE_URL is not set.']);
    exit;
}

$parsed = parse_url($db_url);
$scheme = $parsed['scheme'] ?? 'pgsql';
$host = $parsed['host'] ?? '';
$port = $parsed['port'] ?? ($scheme === 'mysql' ? 3306 : 5432);
$dbname = ltrim($parsed['path'] ?? '', '/');
$user = $parsed['user'] ?? '';
$pass = $parsed['pass'] ?? '';

if ($scheme === 'mysql') {
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
} else {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";
}

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
?>
