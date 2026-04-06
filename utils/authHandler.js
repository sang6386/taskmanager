// utils/authHandler.js
// Giống y chang thầy: CheckLogin + CheckRole
let jwt = require('jsonwebtoken');
let userController = require('../controllers/users');

module.exports = {
    // Giống thầy: check token từ header Bearer HOẶC cookie
    CheckLogin: async function (req, res, next) {
        try {
            let token = req.headers.authorization;
            if (!token || !token.startsWith('Bearer')) {
                if (req.cookies && req.cookies.TOKEN_TASK_MANAGER) {
                    token = req.cookies.TOKEN_TASK_MANAGER;
                } else {
                    res.status(401).send({ message: 'ban chua dang nhap' });
                    return;
                }
            } else {
                token = token.split(' ')[1];
            }

            let result = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            if (result.exp * 1000 < Date.now()) {
                res.status(401).send({ message: 'ban chua dang nhap' });
                return;
            }

            let user = await userController.GetAnUserById(result.id);
            if (!user) {
                res.status(401).send({ message: 'ban chua dang nhap' });
                return;
            }

            req.user = user;
            next();
        } catch (error) {
            res.status(401).send({ message: 'ban chua dang nhap' });
        }
    },

    // Giống thầy: CheckRole nhận nhiều role
    CheckRole: function (...requiredRole) {
        return function (req, res, next) {
            let currentRole = req.user.role;
            if (requiredRole.includes(currentRole)) {
                next();
                return;
            }
            res.status(403).send({ message: 'ban khong co quyen' });
        };
    }
};
