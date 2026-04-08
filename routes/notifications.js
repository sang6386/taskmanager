// routes/notifications.js
let express = require('express');
let router = express.Router();
let notifController = require('../controllers/notifications');
let { CheckLogin } = require('../utils/authHandler');

// GET /api/v1/notifications - Lấy notifications của user đang đăng nhập
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let page  = parseInt(req.query.page)  || 1;
        let limit = parseInt(req.query.limit) || 20;
        let data  = await notifController.GetNotificationsByUserId(req.user.id, page, limit);
        res.send(data);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/notifications/unread-count - Đếm số chưa đọc
router.get('/unread-count', CheckLogin, async function (req, res, next) {
    try {
        let count = await notifController.CountUnread(req.user.id);
        res.send({ count });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PATCH /api/v1/notifications/:id/read - Đánh dấu đã đọc
router.patch('/:id/read', CheckLogin, async function (req, res, next) {
    try {
        let ok = await notifController.MarkAsRead(req.params.id, req.user.id);
        if (!ok) { res.status(404).send({ message: 'Notification khong ton tai' }); return; }
        res.send({ message: 'Da danh dau da doc' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PATCH /api/v1/notifications/read-all - Đánh dấu tất cả đã đọc
router.patch('/read-all', CheckLogin, async function (req, res, next) {
    try {
        await notifController.MarkAllAsRead(req.user.id);
        res.send({ message: 'Da doc tat ca thong bao' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// DELETE /api/v1/notifications/:id - Xoá notification
router.delete('/:id', CheckLogin, async function (req, res, next) {
    try {
        let ok = await notifController.DeleteNotification(req.params.id, req.user.id);
        if (!ok) { res.status(404).send({ message: 'Notification khong ton tai' }); return; }
        res.send({ message: 'Da xoa thong bao' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
