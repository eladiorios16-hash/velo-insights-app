// db.js - CÓDIGO COMPLETO
const mysql = require('mysql2');

const pool = mysql.createPool({
  // Prioriza la red interna de Railway
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  port: parseInt(process.env.MYSQLPORT) || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Eliminamos SSL para la red interna para evitar conflictos
  ssl: false 
});

const promisePool = pool.promise();

// Prueba de conexión para los logs
promisePool.getConnection()
    .then(conn => {
        console.log("✅ [DB] CONEXIÓN INTERNA EXITOSA");
        conn.release();
    })
    .catch(err => {
        console.error("❌ [DB] Error de acceso:", err.message);
    });

module.exports = promisePool;
