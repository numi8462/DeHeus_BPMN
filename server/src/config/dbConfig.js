const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    server: process.env.DB_SERVER,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    connectionTimeout: 30000,  
    requestTimeout: 30000,      
    options: {
        encrypt: true,
        trustServerCertificate: false  // if deploy => false
    }
};

let pool;

async function connectDB() {
    try {
        pool = await sql.connect(dbConfig);
        console.log('Connected to the SQL Database');
    } catch (err) {
        console.error('Database Error: Unable to connect to the database or create table:', err);
    }
}

function getDBConnection() {
    return pool;
}

module.exports = { connectDB, getDBConnection, sql };
