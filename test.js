const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'mysql-146534cc-maxwon555-4b2b.a.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_HkFtwGVfYhp952RnHRd',
    database: 'teacooperative',
    port: '15864',
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database');
});

// Your query to select all data from the 'Factories' table
const query = 'SELECT * FROM fieldinfo';

// Execute the query
db.query(query, (err, results) => {
    if (err) {
        console.error('Error executing query:', err);
        return;
    }

    // Process the results
    console.log('Query results:', results);

    // Close the database connection
    db.end((err) => {
        if (err) {
            console.error('Error closing database connection:', err);
        } else {
            console.log('Database connection closed');
        }
    });
});
