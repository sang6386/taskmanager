// utils/database.js
// Kết nối MySQL - phong cách giống thầy dùng mongoose.connect
let mysql = require('mysql2/promise');

let pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'task_manager_db',
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '+07:00'
});

pool.getConnection()
    .then(conn => {
        console.log('✅ MySQL connected!');
        conn.release();
    })
    .catch(err => {
        console.log('❌ MySQL connection failed:', err.message);
        process.exit(1);
    });

module.exports = pool;
