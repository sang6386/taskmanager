// utils/uploadHandler.js
// Giống y chang thầy: multer diskStorage + filter
let multer = require('multer');
let path = require('path');

// Lưu ở đâu, tên file là gì - giống thầy
let storageSetting = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname);
        let filename = Date.now() + '-' + Math.round(Math.random() * 1_000_000_000) + ext;
        cb(null, filename);
    }
});

// Filter ảnh - giống thầy
let filterImage = function (req, file, cb) {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('file sai dinh dang, chi chap nhan anh'));
    }
};

// Filter file đính kèm (ảnh + pdf + doc)
let filterAttachment = function (req, file, cb) {
    let allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('file sai dinh dang'));
    }
};

module.exports = {
    // Upload 1 ảnh - giống thầy
    uploadImage: multer({
        storage: storageSetting,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: filterImage
    }),
    // Upload file đính kèm vào task
    uploadAttachment: multer({
        storage: storageSetting,
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: filterAttachment
    })
};
