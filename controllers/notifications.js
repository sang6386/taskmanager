// controllers/notifications.js
// controller chứa hàm tương tác DB
let pool = require('../utils/database');

module.exports = {
    // Tạo notification + lưu DB
    CreateNotification: async function (user_id, type, title, message, ref_type, ref_id) {
        let [result] = await pool.query(
            'INSERT INTO notifications (user_id, type, title, message, ref_type, ref_id) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, type, title, message, ref_type || null, ref_id || null]
        );
        let [rows] = await pool.query('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
        return rows[0];
    },

    // Lấy danh sách notifications của user (phân trang)
    GetNotificationsByUserId: async function (userId, page, limit) {
        let offset = (page - 1) * limit;
        let [rows] = await pool.query(
            `SELECT * FROM notifications WHERE user_id = ?
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        let [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [userId]
        );
        let [[{ unread }]] = await pool.query(
            'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0', [userId]
        );
        return { notifications: rows, total, unread };
    },

    // Đánh dấu đã đọc 1 notification
    MarkAsRead: async function (id, userId) {
        let [result] = await pool.query(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    },

    // Đánh dấu tất cả đã đọc
    MarkAllAsRead: async function (userId) {
        await pool.query(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]
        );
        return true;
    },

    // Xoá notification
    DeleteNotification: async function (id, userId) {
        let [result] = await pool.query(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]
        );
        return result.affectedRows > 0;
    },

    // Đếm unread
    CountUnread: async function (userId) {
        let [[{ count }]] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]
        );
        return count;
    }
};
