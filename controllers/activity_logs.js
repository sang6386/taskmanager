// controllers/activity_logs.js
let pool = require('../utils/database');

module.exports = {
    // Ghi log - gọi ở mọi action quan trọng
    CreateLog: async function (user_id, action, target_type, target_id, description, meta) {
        try {
            await pool.query(
                'INSERT INTO activity_logs (user_id, action, target_type, target_id, description, meta) VALUES (?, ?, ?, ?, ?, ?)',
                [user_id, action, target_type, target_id, description || null,
                 meta ? JSON.stringify(meta) : null]
            );
        } catch (err) {
            // Log lỗi nhưng không throw - không để ghi log làm crash app
            console.error('Activity log error:', err.message);
        }
    },

    // Lấy logs theo user
    GetLogsByUserId: async function (userId, page, limit) {
        let offset = (page - 1) * limit;
        let [rows] = await pool.query(
            `SELECT al.*, u.username, u.fullName
             FROM activity_logs al
             JOIN users u ON al.user_id = u.id
             WHERE al.user_id = ?
             ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        let [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM activity_logs WHERE user_id = ?', [userId]
        );
        return { logs: rows, total };
    },

    // Lấy logs theo target (task/project)
    GetLogsByTarget: async function (targetType, targetId, page, limit) {
        let offset = (page - 1) * limit;
        let [rows] = await pool.query(
            `SELECT al.*, u.username, u.fullName, u.avatarUrl
             FROM activity_logs al
             JOIN users u ON al.user_id = u.id
             WHERE al.target_type = ? AND al.target_id = ?
             ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
            [targetType, targetId, limit, offset]
        );
        let [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM activity_logs WHERE target_type = ? AND target_id = ?',
            [targetType, targetId]
        );
        return { logs: rows, total };
    },

    // Lấy tất cả logs (admin)
    GetAllLogs: async function (page, limit) {
        let offset = (page - 1) * limit;
        let [rows] = await pool.query(
            `SELECT al.*, u.username, u.fullName
             FROM activity_logs al
             JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        let [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM activity_logs');
        return { logs: rows, total };
    }
};
