// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  // Busca primero las variables automáticas de Railway (MYSQL...) 
  // y si no están, usa las manuales (DB_...)
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Exportamos la versión con promesas para poder usar 'await' en el server
module.exports = pool.promise();
