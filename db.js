// db.js
const mysql = require('mysql2');

/**
 * Configuramos el pool de conexiones. 
 * Usamos los nombres de variables estándar de Railway.
 */
const pool = mysql.createPool({
  // Host: metro.proxy.rlwy.net
  host: process.env.MYSQLHOST || 'metro.proxy.rlwy.net',
  
  // Usuario y Password: Se extraen de las variables de entorno de Railway
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD,
  
  // Base de datos: Por defecto suele ser 'railway'
  database: process.env.MYSQLDATABASE || 'railway',
  
  // Puerto: 56923 según tu configuración de Networking Pública
  port: process.env.MYSQLPORT || 56923, 
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // Opciones para mantener la conexión activa y evitar cortes
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

/**
 * Verificamos la conexión al iniciar para ver posibles errores en los logs
 */
const promisePool = pool.promise();

promisePool.getConnection()
    .then(connection => {
        console.log("✅ Conexión establecida con MySQL en metro.proxy.rlwy.net");
        connection.release();
    })
    .catch(err => {
        console.error("❌ Error de conexión en db.js:", err.message);
    });

// Exportamos la versión con promesas para usar async/await en server.js
module.exports = promisePool;
