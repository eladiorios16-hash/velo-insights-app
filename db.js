// db.js
const mysql = require('mysql2');

// Intentamos capturar las variables de Railway, sea cual sea el nombre que usen
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'metro.proxy.rlwy.net',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 56923,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Exportamos con promesas para el server.js
module.exports = pool.promise();
