// routes/activity_logs.js
let express = require('express');
let router = express.Router();
let logController = require('../controllers/activity_logs');
let { CheckLogin, CheckRole } = require('../utils/authHandler');

// GET /api/v1/activity-logs - Tất cả logs (admin only)
router.get('/', CheckLogin, CheckRole('admin'), async function (req, res, next) {
    try {
        let page  = parseInt(req.query.page)  || 1;
        let limit = parseInt(req.query.limit) || 20;
        let data  = await logController.GetAllLogs(page, limit);
        res.send(data);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/activity-logs/me - Logs của chính mình
router.get('/me', CheckLogin, async function (req, res, next) {
    try {
        let page  = parseInt(req.query.page)  || 1;
        let limit = parseInt(req.query.limit) || 20;
        let data  = await logController.GetLogsByUserId(req.user.id, page, limit);
        res.send(data);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/activity-logs/task/:id - Logs của task
router.get('/task/:id', CheckLogin, async function (req, res, next) {
    try {
        let page  = parseInt(req.query.page)  || 1;
        let limit = parseInt(req.query.limit) || 20;
        let data  = await logController.GetLogsByTarget('task', req.params.id, page, limit);
        res.send(data);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/activity-logs/project/:id - Logs của project
router.get('/project/:id', CheckLogin, async function (req, res, next) {
    try {
        let page  = parseInt(req.query.page)  || 1;
        let limit = parseInt(req.query.limit) || 20;
        let data  = await logController.GetLogsByTarget('project', req.params.id, page, limit);
        res.send(data);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
