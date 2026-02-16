// db.js - CÓDIGO COMPLETO
const mysql = require('mysql2');

const pool = mysql.createPool({
  // Usamos el host público porque el interno da ENOTFOUND
  host: process.env.MYSQLHOST || 'metro.proxy.rlwy.net',
  port: parseInt(process.env.MYSQLPORT) || 56923,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Esta línea ayuda a evitar el "Access Denied" desde IPs internas de Railway
  ssl: { rejectUnauthorized: false } 
});

const promisePool = pool.promise();

// Log para confirmar éxito en la consola de Railway
promisePool.getConnection()
    .then(conn => {
        console.log("✅ [DB] CONEXIÓN PÚBLICA ESTABLECIDA");
        conn.release();
    })
    .catch(err => {
        console.error("❌ [DB] Error de conexión:", err.message);
    });

module.exports = promisePool;
