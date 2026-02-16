// db.js - Versión Simplificada
const mysql = require('mysql2');

const pool = mysql.createPool({
  // Host y puerto de tu configuración pública
  host: process.env.MYSQLHOST || 'metro.proxy.rlwy.net',
  port: parseInt(process.env.MYSQLPORT) || 3306, 
  
  // Credenciales de tu captura de variables
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  database: process.env.MYSQLDATABASE || 'railway',
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // Eliminamos SSL temporalmente para asegurar la entrada inicial
  ssl: null 
});

const promisePool = pool.promise();

promisePool.getConnection()
    .then(conn => {
        console.log("✅ [DB] CONEXIÓN EXITOSA");
        conn.release();
    })
    .catch(err => {
        console.error("❌ [DB] Error de acceso:", err.message);
    });

module.exports = promisePool;
