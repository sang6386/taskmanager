// controllers/comments.js
let pool = require('../utils/database');

module.exports = {
    CreateAComment: async function (task_id, user_id, content) {
        let [result] = await pool.query(
            'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)',
            [task_id, user_id, content]
        );
        let [rows] = await pool.query(
            `SELECT c.*, u.username, u.fullName, u.avatarUrl
             FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
            [result.insertId]
        );
        return rows[0];
    },

    GetCommentsByTaskId: async function (task_id) {
        let [rows] = await pool.query(
            `SELECT c.*, u.username, u.fullName, u.avatarUrl
             FROM comments c JOIN users u ON c.user_id = u.id
             WHERE c.task_id = ? ORDER BY c.created_at ASC`,
            [task_id]
        );
        return rows;
    },

    GetACommentById: async function (id) {
        let [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [id]);
        return rows[0] || null;
    },

    UpdateAComment: async function (id, content) {
        await pool.query('UPDATE comments SET content = ? WHERE id = ?', [content, id]);
        let [rows] = await pool.query(
            `SELECT c.*, u.username, u.fullName FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
            [id]
        );
        return rows[0];
    },

    DeleteAComment: async function (id) {
        let [result] = await pool.query('DELETE FROM comments WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};
