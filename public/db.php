<?php
// db.php - La Llave Maestra de tu Web

// 1. Detectamos las credenciales de Railway automáticamente
$host = getenv('MYSQLHOST') ?: getenv('DB_HOST');
$user = getenv('MYSQLUSER') ?: getenv('DB_USER');
$pass = getenv('MYSQLPASSWORD') ?: getenv('DB_PASSWORD');
$db   = getenv('MYSQLDATABASE') ?: getenv('DB_NAME');
$port = getenv('MYSQLPORT') ?: getenv('DB_PORT');

// 2. Si faltan datos, avisamos (útil para depurar)
if (empty($host)) {
    die(json_encode(["error" => "No se encuentran las variables de entorno de la base de datos."]));
}

// 3. Conectamos
try {
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    // Si la conexión falla, devolvemos el error en formato JSON
    die(json_encode(["error_conexion" => $e->getMessage()]));
}
?>
