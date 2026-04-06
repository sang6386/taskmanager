// routes/users.js: CRUD users, chỉ admin
let express = require('express');
let router = express.Router();
let userController = require('../controllers/users');
let { CheckLogin, CheckRole } = require('../utils/authHandler');

// GET /api/v1/users - CheckRole
router.get('/', CheckLogin, CheckRole('admin'), async function (req, res, next) {
    try {
        let page  = parseInt(req.query.page)  || 1;
        let limit = parseInt(req.query.limit) || 10;
        let { users, total } = await userController.GetAllUsers(page, limit);
        res.send({ users, total, page, limit });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/users/:id
router.get('/:id', CheckLogin, async function (req, res, next) {
    try {
        let user = await userController.GetAnUserById(req.params.id);
        if (!user) {
            res.status(404).send({ message: 'id not found' });
            return;
        }
        res.send(user);
    } catch (error) {
        res.status(404).send({ message: 'id not found' });
    }
});

// PATCH /api/v1/users/:id/deactivate - Khoá tài khoản (admin)
router.patch('/:id/deactivate', CheckLogin, CheckRole('admin'), async function (req, res, next) {
    try {
        if (parseInt(req.params.id) === req.user.id) {
            res.status(400).send({ message: 'khong the khoa chinh minh' });
            return;
        }
        let updated = await userController.UpdateUser(req.params.id, { is_active: 0 });
        res.send({ message: 'da khoa tai khoan', user: updated });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PATCH /api/v1/users/:id/activate - Mở khoá tài khoản (admin)
router.patch('/:id/activate', CheckLogin, CheckRole('admin'), async function (req, res, next) {
    try {
        let updated = await userController.UpdateUser(req.params.id, { is_active: 1 });
        res.send({ message: 'da mo khoa tai khoan', user: updated });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
