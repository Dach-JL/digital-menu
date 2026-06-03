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

// Lightweight cURL-based Pusher trigger helper for local development (no Composer dependencies needed)
function triggerPusherEvent($channel, $event, $data) {
    $appId = getenv('PUSHER_APP_ID') ?: (getenv('app_id') ?: ($_ENV['PUSHER_APP_ID'] ?? ($_ENV['app_id'] ?? '')));
    $key = getenv('PUSHER_KEY') ?: (getenv('key') ?: ($_ENV['PUSHER_KEY'] ?? ($_ENV['key'] ?? '')));
    $secret = getenv('PUSHER_SECRET') ?: (getenv('secret') ?: ($_ENV['PUSHER_SECRET'] ?? ($_ENV['secret'] ?? '')));
    $cluster = getenv('PUSHER_CLUSTER') ?: (getenv('cluster') ?: ($_ENV['PUSHER_CLUSTER'] ?? ($_ENV['cluster'] ?? 'mt1')));

    // Strip quotes if they were loaded from .env
    $appId = trim($appId, " \t\n\r\0\x0B\"'");
    $key = trim($key, " \t\n\r\0\x0B\"'");
    $secret = trim($secret, " \t\n\r\0\x0B\"'");
    $cluster = trim($cluster, " \t\n\r\0\x0B\"'");

    if (empty($appId) || empty($key) || empty($secret)) {
        return false;
    }

    $data_encoded = json_encode($data);
    $body = json_encode([
        'name' => $event,
        'channels' => [$channel],
        'data' => $data_encoded
    ]);

    $path = "/apps/{$appId}/events";
    $timestamp = time();
    $body_md5 = md5($body);

    $params = [
        'auth_key' => $key,
        'auth_timestamp' => $timestamp,
        'auth_version' => '1.0',
        'body_md5' => $body_md5
    ];
    ksort($params);

    $query_string = http_build_query($params);
    $string_to_sign = "POST\n{$path}\n{$query_string}";
    $signature = hash_hmac('sha256', $string_to_sign, $secret);

    $url = "https://api-{$cluster}.pusher.com{$path}?{$query_string}&auth_signature={$signature}";

    $ch = curl_init($url);
    if (!$ch) return false;
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($body)
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    
    // Disable SSL verification for local development testing to prevent SSL errors on Windows
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    $response = curl_exec($ch);
    if ($response === false) {
        error_log('Pusher trigger curl error: ' . curl_error($ch));
    }
    curl_close($ch);
    return $response !== false;
}
?>

