// routes/upload.js
// one_file, multiple_files + serve file
let express = require('express');
let router = express.Router();
let path = require('path');
let { uploadImage, uploadAttachment } = require('../utils/uploadHandler');

// POST /api/v1/upload/one_file
router.post('/one_file', uploadImage.single('file'), function (req, res, next) {
    if (!req.file) {
        res.status(400).send({ message: 'file khong duoc de trong' });
    } else {
        res.send({
            filename: req.file.filename,
            path: '/api/v1/upload/' + req.file.filename,
            size: req.file.size
        });
    }
});

// POST /api/v1/upload/multiple_files
router.post('/multiple_files', uploadImage.array('files'), function (req, res, next) {
    if (!req.files || req.files.length === 0) {
        res.status(400).send({ message: 'file khong duoc de trong' });
    } else {
        res.send(req.files.map(f => ({
            filename: f.filename,
            path: '/api/v1/upload/' + f.filename,
            size: f.size
        })));
    }
});

// POST /api/v1/upload/attachment - Upload file đính kèm (ảnh + pdf + doc)
router.post('/attachment', uploadAttachment.single('file'), function (req, res, next) {
    if (!req.file) {
        res.status(400).send({ message: 'file khong duoc de trong' });
    } else {
        res.send({
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            path: '/api/v1/upload/' + req.file.filename,
            size: req.file.size
        });
    }
});

// GET /api/v1/upload/:filename - Serve file
router.get('/:filename', function (req, res, next) {
    let pathFile = path.join(__dirname, '../uploads', req.params.filename);
    res.sendFile(pathFile);
});

module.exports = router;
