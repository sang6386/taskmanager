// app.js
require('dotenv').config();
var createError  = require('http-errors');
var express      = require('express');
var path         = require('path');
var cookieParser = require('cookie-parser');
var logger       = require('morgan');
var cors         = require('cors');

var app = express();

// setup middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// mount routes
app.use('/',                  require('./routes/index'));
app.use('/api/v1/auth',       require('./routes/auth'));
app.use('/api/v1/users',      require('./routes/users'));
app.use('/api/v1/projects',   require('./routes/projects'));
app.use('/api/v1/tasks',      require('./routes/tasks'));
app.use('/api/v1/upload',         require('./routes/upload'));
app.use('/api/v1/notifications',  require('./routes/notifications'));
app.use('/api/v1/activity-logs',  require('./routes/activity_logs'));

// Kết nối DB mongoose.connect
require('./utils/database');

// catch 404
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error   = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.send({ message: err.message });
});

module.exports = app;
