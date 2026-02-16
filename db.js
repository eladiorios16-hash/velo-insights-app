// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  // Host corregido según tu captura de Networking Pública
  host: process.env.MYSQLHOST || 'metro.proxy.rlwy.net',
  
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE || 'railway',
  
  // PUERTO CRÍTICO: Cambiado de 3306 al que muestra tu captura
  port: process.env.MYSQLPORT || 56923, 
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
  // Añadimos esto para evitar problemas de desconexión en Railway
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Exportamos la versión con promesas para poder usar 'await' en el server
module.exports = pool.promise();
