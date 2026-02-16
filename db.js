const mysql = require('mysql2');

const pool = mysql.createPool({
  // Forzamos los valores internos confirmados en tus capturas
  host: 'mysql.railway.internal',
  port: 3306,
  user: 'root',
  password: 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  database: 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();
