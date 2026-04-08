// utils/validator.js
// validatedResult + các validator riêng
let { body, validationResult } = require('express-validator');

module.exports = {
    // trả về mảng lỗi theo format {field: message}
    validatedResult: function (req, res, next) {
        let result = validationResult(req);
        if (result.errors.length > 0) {
            res.status(400).send(result.errors.map(function (e) {
                return { [e.path]: e.msg };
            }));
            return;
        }
        next();
    },

    // Validator đăng ký
    RegisterValidator: [
        body('username').notEmpty().withMessage('username khong duoc de trong')
            .bail().isAlphanumeric().withMessage('username khong duoc chua ki tu dac biet'),
        body('email').notEmpty().withMessage('email khong duoc de trong')
            .bail().isEmail().withMessage('email sai dinh dang'),
        body('password').notEmpty().withMessage('password khong duoc de trong')
            .bail().isLength({ min: 6 }).withMessage('password phai co it nhat 6 ki tu')
    ],

    // Validator đổi mật khẩu
    ChangePasswordValidator: [
        body('oldpassword').notEmpty().withMessage('mat khau cu khong duoc de trong'),
        body('newpassword').notEmpty().withMessage('mat khau moi khong duoc de trong')
            .bail().isLength({ min: 6 }).withMessage('mat khau moi phai co it nhat 6 ki tu')
    ],

    // Validator tạo project
    CreateProjectValidator: [
        body('name').notEmpty().withMessage('ten project khong duoc de trong')
            .bail().isLength({ min: 3, max: 200 }).withMessage('ten project phai tu 3-200 ki tu')
    ],

    // Validator tạo task
    CreateTaskValidator: [
        body('title').notEmpty().withMessage('tieu de task khong duoc de trong')
            .bail().isLength({ min: 3, max: 300 }).withMessage('tieu de phai tu 3-300 ki tu'),
        body('project_id').notEmpty().withMessage('project_id khong duoc de trong')
            .bail().isInt({ min: 1 }).withMessage('project_id phai la so nguyen duong'),
        body('priority').optional()
            .isIn(['low', 'medium', 'high', 'urgent']).withMessage('priority khong hop le'),
        body('assignee_name').optional().isAlphanumeric().withMessage('ten nguoi dung khong hop le')
    ],

    // Validator comment
    CreateCommentValidator: [
        body('content').notEmpty().withMessage('noi dung comment khong duoc de trong')
    ]
};
