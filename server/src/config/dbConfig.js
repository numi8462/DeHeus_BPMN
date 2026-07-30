const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function connectDB() {
    try {
        await pool.query('SELECT 1');
        console.log('Connected to the SQL Database');
    } catch (err) {
        console.error('Database Error: Unable to connect to the database or create table:', err);
    }
}

function getDBConnection() {
    return pool;
}

module.exports = { connectDB, getDBConnection, pool };
