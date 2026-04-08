// controllers/users.js
// controller chứa các hàm tương tác DB
let pool = require('../utils/database');
let bcrypt = require('bcrypt');

module.exports = {
    // CreateAnUser
    CreateAnUser: async function (username, password, email, fullName, avatarUrl, role) {
        let salt = bcrypt.genSaltSync(10);
        let hashedPassword = bcrypt.hashSync(password, salt);

        let [result] = await pool.query(
            'INSERT INTO users (username, password, email, fullName, avatarUrl, role) VALUES (?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, email, fullName || '', avatarUrl || '', role || 'member']
        );
        return module.exports.GetAnUserById(result.insertId);
    },

    // GetAnUserByUsername
    GetAnUserByUsername: async function (username) {
        let [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND is_active = 1',
            [username]
        );
        return rows[0] || null;
    },

    // GetAnUserById
    GetAnUserById: async function (id) {
        let [rows] = await pool.query(
            'SELECT id, username, email, fullName, avatarUrl, role, is_active, loginCount, lockTime, created_at FROM users WHERE id = ? AND is_active = 1',
            [id]
        );
        return rows[0] || null;
    },

    // GetAnUserByEmail
    GetAnUserByEmail: async function (email) {
        let [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ? AND is_active = 1',
            [email]
        );
        return rows[0] || null;
    },

    // Lấy tất cả users - dùng cho admin
    GetAllUsers: async function (page, limit) {
        let offset = (page - 1) * limit;
        let [rows] = await pool.query(
            'SELECT id, username, email, fullName, avatarUrl, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        let [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM users');
        return { users: rows, total };
    },

    // Update user
    UpdateUser: async function (id, data) {
        let allowed = ['fullName', 'avatarUrl', 'is_active'];
        let updates = [];
        let values = [];
        Object.keys(data).forEach(key => {
            if (allowed.includes(key) && data[key] !== undefined) {
                updates.push(`${key} = ?`);
                values.push(data[key]);
            }
        });
        if (updates.length === 0) return module.exports.GetAnUserById(id);
        values.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        return module.exports.GetAnUserById(id);
    },

    // Update avatar
    UpdateAvatar: async function (id, avatarUrl) {
        await pool.query('UPDATE users SET avatarUrl = ? WHERE id = ?', [avatarUrl, id]);
        return module.exports.GetAnUserById(id);
    },

    // Update loginCount + lockTime
    UpdateLoginCount: async function (id, loginCount, lockTime) {
        await pool.query(
            'UPDATE users SET loginCount = ?, lockTime = ? WHERE id = ?',
            [loginCount, lockTime || 0, id]
        );
    }
};
