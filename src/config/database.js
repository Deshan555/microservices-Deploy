const mysql = require('mysql');
const util = require('util');

const db = mysql.createConnection({
    host: 'mysql-146534cc-maxwon555-4b2b.a.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_HkFtwGVfYhp952RnHRd',
    database: 'teacooperative',
    port: '15864',
});

// Promisify the query method
const query = util.promisify(db.query).bind(db);

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to the database');
    }
});

module.exports = { db, query };


