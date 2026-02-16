// db.js - Versión con Corrección de Protocolo MySQL 8
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  port: 3306,
  user: 'root',
  password: (process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW').trim(),
  database: 'railway',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  // ESTAS DOS LÍNEAS SON LA SOLUCIÓN AL "ACCESS DENIED" INTERNO:
  enableKeepAlive: true,
  allowPublicKeyRetrieval: true 
});

const promisePool = pool.promise();

promisePool.getConnection()
    .then(conn => {
        console.log("✅ [DB] CONEXIÓN INTERNA ESTABLECIDA (RSA ACTIVADO)");
        conn.release();
    })
    .catch(err => {
        console.error("❌ [DB] Error:", err.message);
    });

module.exports = promisePool;
