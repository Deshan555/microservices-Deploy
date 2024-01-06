// Desc: Database configuration
const mysql = require('mysql');
const util = require('util');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'TeaCooperative',
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
