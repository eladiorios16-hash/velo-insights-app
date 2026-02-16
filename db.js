// db.js - Versión Final Limpia
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  port: 3306,
  user: 'root',
  database: 'railway',
  // El .trim() es la clave: borra espacios invisibles al principio o final
  password: (process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW').trim(),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

const promisePool = pool.promise();

// Log de diagnóstico
promisePool.getConnection()
    .then(conn => {
        console.log("✅ [DB] CONEXIÓN INTERNA ESTABLECIDA");
        conn.release();
    })
    .catch(err => {
        console.error("❌ [DB] Error de Auth:", err.message);
    });

module.exports = promisePool;
