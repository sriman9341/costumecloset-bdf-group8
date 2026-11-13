
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Connect to SQLite database
const dbPath = path.join(__dirname, 'costumecloset.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Connected to CostumeCloset database');
    }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Read and execute schema.sql
const schema = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf8'
);

db.exec(schema, (err) => {
    if (err) {
        console.error('Schema creation failed:', err.message);
    } else {
        console.log('Database tables created successfully');
    }
});

module.exports = db;
