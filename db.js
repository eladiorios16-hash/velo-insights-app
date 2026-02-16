const mysql = require('mysql2');

// Usamos la URL completa que Railway nos da automáticamente
// Esto evita errores de espacios, puertos incorrectos o contraseñas desfasadas.
const connectionString = process.env.MYSQL_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERROR CRÍTICO: No se encuentra la variable MYSQL_URL");
}

const pool = mysql.createPool({
    uri: connectionString,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    // Forzamos compatibilidad por si acaso
    multipleStatements: true
});

const promisePool = pool.promise();

promisePool.getConnection()
    .then(conn => {
        console.log("✅ [DB] CONEXIÓN NUEVA Y LIMPIA ESTABLECIDA");
        conn.release();
    })
    .catch(err => {
        console.error("❌ [DB] Error:", err.message);
    });

module.exports = promisePool;
