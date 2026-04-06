// socket/socket.js
// Real-time dùng cho notifications + comments

let onlineUsers = new Map(); // userId -> socketId

function initSocket(io) {
    io.on('connection', function (socket) {
        console.log('🔌 Socket connected:', socket.id);

        // User join vào room của mình - user join room
        socket.on('join', function (userId) {
            socket.join('user_' + userId);
            onlineUsers.set(userId, socket.id);
            console.log('👤 User', userId, 'joined');

            // Thông báo cho mọi người biết user này online
            io.emit('user_online', { userId, online: true });
        });

        // User join vào room của project để nhận notification
        socket.on('join_project', function (projectId) {
            socket.join('project_' + projectId);
            console.log('📁 Joined project room:', projectId);
        });

        // User join vào room của task để nhận comment real-time
        socket.on('join_task', function (taskId) {
            socket.join('task_' + taskId);
            console.log('✅ Joined task room:', taskId);
        });

        // Ngắt kết nối
        socket.on('disconnect', function () {
            onlineUsers.forEach(function (sid, userId) {
                if (sid === socket.id) {
                    onlineUsers.delete(userId);
                    io.emit('user_online', { userId, online: false });
                }
            });
            console.log('❌ Socket disconnected:', socket.id);
        });
    });
}

// Gửi notification đến user cụ thể
function sendNotification(io, userId, data) {
    io.to('user_' + userId).emit('notification', data);
}

// Gửi comment mới đến tất cả người trong task room
function sendNewComment(io, taskId, comment) {
    io.to('task_' + taskId).emit('new_comment', comment);
}

// Gửi task update đến project room
function sendTaskUpdate(io, projectId, data) {
    io.to('project_' + projectId).emit('task_updated', data);
}

// Gửi task mới đến project room
function sendNewTask(io, projectId, task) {
    io.to('project_' + projectId).emit('new_task', task);
}

module.exports = { initSocket, sendNotification, sendNewComment, sendTaskUpdate, sendNewTask };
