// routes/index.js
let express = require('express');
let router = express.Router();

router.get('/', function (req, res, next) {
    res.send({
        message: 'Task Manager API v2',
        version: '2.0.0',
        endpoints: {
            auth:     '/api/v1/auth',
            users:    '/api/v1/users',
            projects: '/api/v1/projects',
            tasks:    '/api/v1/tasks',
            upload:   '/api/v1/upload'
        }
    });
});

module.exports = router;
