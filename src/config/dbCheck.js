const sql = require('mssql');

// Configuration for SQL Server
const config = {
  user: 'vixen',
  password: '890/fuck',
  server: 'vixen.database.windows.net',
  database: 'thaprobane',
  options: {
    encrypt: true, // Use encryption (for Azure)
    trustServerCertificate: false, // Change to true if using self-signed certificates
  },
};

// Create a pool of connections
const pool = new sql.ConnectionPool(config);

// Connect to the database
pool.connect().then(() => {
  console.log('Connection to SQL Server successful!');
}).catch((err) => {
  console.error('Error connecting to SQL Server:', err);
}).finally(() => {
  // Close the pool to release resources (optional)
  pool.close();
});
