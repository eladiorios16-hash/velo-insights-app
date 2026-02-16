const mysql = require('mysql2');

// Intentamos usar las variables de Railway, si no, usamos los valores de tus capturas
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  port: parseInt(process.env.MYSQLPORT) || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  // Forzamos compatibilidad para evitar el error de "Access Denied"
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

const promisePool = pool.promise();

// Prueba de conexión con log detallado
promisePool.getConnection()
    .then(conn => {
        console.log("✅ [DB] CONEXIÓN EXITOSA");
        conn.release();
    })
    .catch(err => {
        console.error("❌ [DB] Error Detallado:", err.code, err.message);
    });

module.exports = promisePool;
