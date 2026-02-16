// db.js - CÓDIGO COMPLETO
const mysql = require('mysql2');

const pool = mysql.createPool({
  // Host público confirmado en tus capturas
  host: process.env.MYSQLHOST || 'metro.proxy.rlwy.net',
  
  // ¡RECUERDA CORREGIR ESTO! En tu captura pusiste 59623, pero es 56923
  port: parseInt(process.env.MYSQLPORT) || 56923, 
  
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  database: process.env.MYSQLDATABASE || 'railway',
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false } // Vital para conectar desde fuera a Railway
});

// Esto exporta el pool permitiendo usar async/await en server.js
const promisePool = pool.promise();

// Prueba de conexión inmediata para el log
promisePool.getConnection()
    .then(conn => {
        console.log("✅ [DB] Conexión establecida con éxito");
        conn.release();
    })
    .catch(err => {
        console.error("❌ [DB] Error de conexión:", err.message);
    });

module.exports = promisePool;
