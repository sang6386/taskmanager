// routes/auth.js
// register + login + me + logout + changepassword
let express = require('express');
let router = express.Router();
let bcrypt = require('bcrypt');
let jwt = require('jsonwebtoken');
let userController = require('../controllers/users');
let { CheckLogin } = require('../utils/authHandler');
let { RegisterValidator, ChangePasswordValidator, validatedResult } = require('../utils/validator');
let { uploadImage } = require('../utils/uploadHandler');
let pool = require('../utils/database');

// POST /api/v1/auth/register
router.post('/register', RegisterValidator, validatedResult, async function (req, res, next) {
    let connection = await pool.getConnection();
    try {
        let { username, password, email, fullName } = req.body;

        // Kiểm tra trùng
        let existing = await userController.GetAnUserByUsername(username);
        if (existing) {
            res.status(400).send({ message: 'username da ton tai' });
            return;
        }
        let existingEmail = await userController.GetAnUserByEmail(email);
        if (existingEmail) {
            res.status(400).send({ message: 'email da ton tai' });
            return;
        }

        // Dùng transaction register tạo user + cart
        await connection.beginTransaction();
        let salt = bcrypt.genSaltSync(10);
        let hashedPassword = bcrypt.hashSync(password, salt);

        let [result] = await connection.query(
            'INSERT INTO users (username, password, email, fullName) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email, fullName || '']
        );
        let userId = result.insertId;

        // Tạo JWT
        let token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        // Set cookie
        res.cookie('TOKEN_TASK_MANAGER', token, {
            maxAge: 30 * 3600 * 24 * 1000,
            httpOnly: true,
            secure: false
        });

        await connection.commit();

        let [rows] = await connection.query(
            'SELECT id, username, email, fullName, avatarUrl, role FROM users WHERE id = ?', [userId]
        );
        res.send({ user: rows[0], token });
    } catch (error) {
        await connection.rollback();
        res.status(400).send({ message: error.message });
    } finally {
        connection.release();
    }
});

// POST /api/v1/auth/login
router.post('/login', async function (req, res, next) {
    try {
        let { username, password } = req.body;
        let user = await userController.GetAnUserByUsername(username);

        if (!user) {
            res.status(404).send({ message: 'thong tin dang nhap khong dung' });
            return;
        }

        // check lockTime
        if (user.lockTime > Date.now()) {
            res.status(403).send({ message: 'tai khoan dang bi khoa, thu lai sau 1 gio' });
            return;
        }

        if (bcrypt.compareSync(password, user.password)) {
            // Đúng password - reset loginCount
            await userController.UpdateLoginCount(user.id, 0, 0);

            let token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

            // Set cookie
            res.cookie('TOKEN_TASK_MANAGER', token, {
                maxAge: 30 * 3600 * 24 * 1000,
                httpOnly: true,
                secure: false
            });
            res.send({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, fullName: user.fullName, avatarUrl: user.avatarUrl } });
        } else {
            // Sai password - tăng loginCount
            let newCount = (user.loginCount || 0) + 1;
            let lockTime = 0;
            if (newCount >= 5) {
                newCount = 0;
                lockTime = Date.now() + 3600 * 1000; // Khoá 1 giờ
            }
            await userController.UpdateLoginCount(user.id, newCount, lockTime);
            res.status(404).send({ message: 'thong tin dang nhap khong dung' });
        }
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/auth/me
router.get('/me', CheckLogin, function (req, res, next) {
    res.send(req.user);
});

// POST /api/v1/auth/logout
router.post('/logout', CheckLogin, function (req, res, next) {
    res.cookie('TOKEN_TASK_MANAGER', null, { maxAge: 0, httpOnly: true, secure: false });
    res.send({ message: 'da logout' });
});

// POST /api/v1/auth/changepassword
router.post('/changepassword', CheckLogin, ChangePasswordValidator, validatedResult, async function (req, res, next) {
    try {
        let { oldpassword, newpassword } = req.body;
        // Lấy user với password để verify
        let [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        let user = rows[0];

        if (bcrypt.compareSync(oldpassword, user.password)) {
            let salt = bcrypt.genSaltSync(10);
            let hashed = bcrypt.hashSync(newpassword, salt);
            await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
            res.send({ message: 'da doi mat khau thanh cong' });
        } else {
            res.status(400).send({ message: 'mat khau cu khong dung' });
        }
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PUT /api/v1/auth/profile - Cập nhật profile
router.put('/profile', CheckLogin, async function (req, res, next) {
    try {
        let { fullName } = req.body;
        let updated = await userController.UpdateUser(req.user.id, { fullName });
        res.send(updated);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// POST /api/v1/auth/avatar - Upload avatar
router.post('/avatar', CheckLogin, uploadImage.single('file'), async function (req, res, next) {
    try {
        if (!req.file) {
            res.status(400).send({ message: 'file khong duoc de trong' });
            return;
        }
        let avatarUrl = '/api/v1/upload/' + req.file.filename;
        let updated = await userController.UpdateAvatar(req.user.id, avatarUrl);
        res.send({ user: updated, filename: req.file.filename, path: avatarUrl });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
