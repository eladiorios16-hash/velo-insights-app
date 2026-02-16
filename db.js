// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'metro.proxy.rlwy.net',
  port: parseInt(process.env.MYSQLPORT) || 56923,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Esta línea es vital para conexiones externas desde Railway
  ssl: { rejectUnauthorized: false }
});

module.exports = pool.promise();
