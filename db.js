// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  // Host público de tu captura
  host: process.env.MYSQLHOST || 'metro.proxy.rlwy.net',
  
  // Puerto público de tu captura
  port: process.env.MYSQLPORT || 56923,
  
  // Credenciales confirmadas
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  database: process.env.MYSQLDATABASE || 'railway',
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

module.exports = pool.promise();
