const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  port: 3306,
  user: 'root',
  password: 'gbDeOMOSothCZuATgwzgGIHLEALTdcvW',
  database: 'railway',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  // ESTO ES LO QUE SOLUCIONA EL "ACCESS DENIED" EN REDES IPv6 INTERNAS
  authPlugins: {
    mysql_clear_password: () => () => Buffer.from('gbDeOMOSothCZuATgwzgGIHLEALTdcvW')
  }
});

module.exports = pool.promise();
