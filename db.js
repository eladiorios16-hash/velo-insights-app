// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  // Host interno de tu captura
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  
  // Usuario: root
  user: process.env.MYSQLUSER || 'root',
  
  // Password de tu captura: gbDeOMOSothCZuATgwzgGIHLEALTdcvW
  password: process.env.MYSQLPASSWORD || 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  
  // Database de tu captura
  database: process.env.MYSQLDATABASE || 'railway',
  
  // Puerto interno estándar
  port: process.env.MYSQLPORT || 3306,
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();
