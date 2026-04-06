// routes/tasks.js
// CRUD tasks + upload file đính kèm + socket real-time notification
let express = require('express');
let router = express.Router();
let path = require('path');
let taskController = require('../controllers/tasks');
let projectController = require('../controllers/projects');
let commentController = require('../controllers/comments');
let { CheckLogin } = require('../utils/authHandler');
let { CreateTaskValidator, CreateCommentValidator, validatedResult } = require('../utils/validator');
let { uploadAttachment } = require('../utils/uploadHandler');
let { sendNotification, sendNewComment, sendTaskUpdate, sendNewTask } = require('../socket/socket');

// GET /api/v1/tasks/stats - Thống kê (đặt TRƯỚC /:id)
router.get('/stats', CheckLogin, async function (req, res, next) {
    try {
        let project_id = req.query.project_id ? parseInt(req.query.project_id) : null;
        let stats = await taskController.GetStats(project_id);
        res.send(stats);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/tasks - Danh sách tasks với filter + sort + pagination
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let { project_id, assignee_id, status, priority, search, sort, order, deadline_before, deadline_after } = req.query;
        let page  = parseInt(req.query.page)  || 1;
        let limit = parseInt(req.query.limit) || 10;

        let { tasks, total } = await taskController.GetAllTasks({
            project_id:      project_id  ? parseInt(project_id)  : null,
            assignee_id:     assignee_id ? parseInt(assignee_id) : null,
            status, priority, search, sort, order,
            page, limit, deadline_before, deadline_after
        });
        res.send({ tasks, total, page, limit });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/tasks/:id - Chi tiết task + comments + attachments
router.get('/:id', CheckLogin, async function (req, res, next) {
    try {
        let task = await taskController.GetATaskById(req.params.id);
        if (!task) {
            res.status(404).send({ message: 'id not found' });
            return;
        }
        let comments    = await commentController.GetCommentsByTaskId(req.params.id);
        let attachments = await taskController.GetAttachments(req.params.id);
        res.send({ ...task, comments, attachments });
    } catch (error) {
        res.status(404).send({ message: 'id not found' });
    }
});

// POST /api/v1/tasks - Tạo task + socket thông báo real-time
router.post('/', CheckLogin, CreateTaskValidator, validatedResult, async function (req, res, next) {
    try {
        let { title, description, priority, project_id, assignee_id, deadline } = req.body;
        let io = req.app.get('io');

        // Kiểm tra project tồn tại + quyền thành viên
        let project = await projectController.GetAProjectById(project_id);
        if (!project) {
            res.status(404).send({ message: 'project khong ton tai' });
            return;
        }
        let membership = await projectController.IsMember(project_id, req.user.id);
        if (!membership && req.user.role !== 'admin') {
            res.status(403).send({ message: 'ban khong phai thanh vien project' });
            return;
        }

        let task = await taskController.CreateATask(
            title, description, priority, project_id, req.user.id, assignee_id, deadline
        );

        // Socket: thông báo task mới cho project room - giống thầy gửi message
        sendNewTask(io, project_id, task);

        // Socket: thông báo riêng cho người được giao task
        if (assignee_id && assignee_id != req.user.id) {
            sendNotification(io, assignee_id, {
                type: 'task_assigned',
                message: `Ban duoc giao task: "${title}"`,
                task: task
            });
        }

        res.send(task);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PUT /api/v1/tasks/:id - Cập nhật task + socket
router.put('/:id', CheckLogin, async function (req, res, next) {
    try {
        let io = req.app.get('io');
        let task = await taskController.GetATaskById(req.params.id);
        if (!task) {
            res.status(404).send({ message: 'id not found' });
            return;
        }

        // Kiểm tra quyền: creator, assignee, project owner, admin
        let project   = await projectController.GetAProjectById(task.project_id);
        let isCreator = task.creator_id  === req.user.id;
        let isAssign  = task.assignee_id === req.user.id;
        let isOwner   = project.owner_id === req.user.id;
        let isAdmin   = req.user.role    === 'admin';

        if (!isCreator && !isAssign && !isOwner && !isAdmin) {
            res.status(403).send({ message: 'ban khong co quyen' });
            return;
        }

        let updated = await taskController.UpdateATask(req.params.id, req.body);

        // Socket: thông báo update cho project room
        sendTaskUpdate(io, task.project_id, updated);

        // Socket: nếu đổi assignee, thông báo người mới
        if (req.body.assignee_id && req.body.assignee_id != task.assignee_id) {
            sendNotification(io, req.body.assignee_id, {
                type: 'task_assigned',
                message: `Ban duoc giao task: "${updated.title}"`,
                task: updated
            });
        }

        res.send(updated);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PATCH /api/v1/tasks/:id/status - Đổi status nhanh + socket
router.patch('/:id/status', CheckLogin, async function (req, res, next) {
    try {
        let io = req.app.get('io');
        let { status } = req.body;
        let validStatuses = ['todo', 'in_progress', 'review', 'done'];
        if (!validStatuses.includes(status)) {
            res.status(400).send({ message: 'status khong hop le' });
            return;
        }
        let task = await taskController.GetATaskById(req.params.id);
        if (!task) {
            res.status(404).send({ message: 'id not found' });
            return;
        }
        let updated = await taskController.UpdateATask(req.params.id, { status });

        // Socket: thông báo thay đổi status
        sendTaskUpdate(io, task.project_id, { ...updated, changed: 'status' });

        // Socket: thông báo cho creator nếu assignee đổi sang done/review
        if (task.creator_id !== req.user.id && (status === 'done' || status === 'review')) {
            sendNotification(io, task.creator_id, {
                type: 'task_status_changed',
                message: `Task "${task.title}" duoc cap nhat: ${status}`,
                task: updated
            });
        }

        res.send(updated);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PATCH /api/v1/tasks/:id/assign - Giao task
router.patch('/:id/assign', CheckLogin, async function (req, res, next) {
    try {
        let io = req.app.get('io');
        let { assignee_id } = req.body;
        let task = await taskController.GetATaskById(req.params.id);
        if (!task) {
            res.status(404).send({ message: 'id not found' });
            return;
        }
        if (assignee_id) {
            let membership = await projectController.IsMember(task.project_id, assignee_id);
            if (!membership) {
                res.status(400).send({ message: 'nguoi duoc giao phai la thanh vien project' });
                return;
            }
        }
        let updated = await taskController.UpdateATask(req.params.id, { assignee_id: assignee_id || null });

        // Socket: thông báo người được giao
        if (assignee_id) {
            sendNotification(io, assignee_id, {
                type: 'task_assigned',
                message: `Ban duoc giao task: "${task.title}"`,
                task: updated
            });
        }

        res.send(updated);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// DELETE /api/v1/tasks/:id
router.delete('/:id', CheckLogin, async function (req, res, next) {
    try {
        let task = await taskController.GetATaskById(req.params.id);
        if (!task) {
            res.status(404).send({ message: 'id not found' });
            return;
        }
        let project   = await projectController.GetAProjectById(task.project_id);
        let isCreator = task.creator_id  === req.user.id;
        let isOwner   = project.owner_id === req.user.id;
        let isAdmin   = req.user.role    === 'admin';
        if (!isCreator && !isOwner && !isAdmin) {
            res.status(403).send({ message: 'ban khong co quyen' });
            return;
        }
        await taskController.DeleteATask(req.params.id);
        res.send({ message: 'da xoa task' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// ─── UPLOAD FILE ĐÍNH KÈM ─────────────────────────────────────
// POST /api/v1/tasks/:id/attachments - Upload file vào task 
router.post('/:id/attachments', CheckLogin, uploadAttachment.single('file'), async function (req, res, next) {
    try {
        let task = await taskController.GetATaskById(req.params.id);
        if (!task) {
            res.status(404).send({ message: 'task khong ton tai' });
            return;
        }
        if (!req.file) {
            res.status(400).send({ message: 'file khong duoc de trong' });
            return;
        }
        let attachment = await taskController.AddAttachment(req.params.id, req.user.id, req.file);
        res.send({ ...attachment, url: '/api/v1/upload/' + req.file.filename });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/tasks/:id/attachments - Lấy danh sách file đính kèm
router.get('/:id/attachments', CheckLogin, async function (req, res, next) {
    try {
        let attachments = await taskController.GetAttachments(req.params.id);
        res.send(attachments.map(a => ({ ...a, url: '/api/v1/upload/' + a.filename })));
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// ─── COMMENTS + SOCKET REAL-TIME ──────────────────────────────
// POST /api/v1/tasks/:id/comments - Thêm comment + socket real-time giống thầy messages
router.post('/:id/comments', CheckLogin, CreateCommentValidator, validatedResult, async function (req, res, next) {
    try {
        let io = req.app.get('io');
        let task = await taskController.GetATaskById(req.params.id);
        if (!task) {
            res.status(404).send({ message: 'task khong ton tai' });
            return;
        }
        let comment = await commentController.CreateAComment(req.params.id, req.user.id, req.body.content);

        // Socket: gửi comment real-time đến task room - giống thầy gửi message
        sendNewComment(io, req.params.id, comment);

        // Socket: thông báo cho task owner nếu người khác comment
        if (task.creator_id !== req.user.id) {
            sendNotification(io, task.creator_id, {
                type: 'new_comment',
                message: `${req.user.username} da binh luan vao task: "${task.title}"`,
                comment: comment,
                task_id: req.params.id
            });
        }

        res.send(comment);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/tasks/:id/comments - Lấy comments
router.get('/:id/comments', CheckLogin, async function (req, res, next) {
    try {
        let comments = await commentController.GetCommentsByTaskId(req.params.id);
        res.send(comments);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PUT /api/v1/tasks/:taskId/comments/:commentId - Sửa comment
router.put('/:taskId/comments/:commentId', CheckLogin, async function (req, res, next) {
    try {
        let comment = await commentController.GetACommentById(req.params.commentId);
        if (!comment) {
            res.status(404).send({ message: 'comment khong ton tai' });
            return;
        }
        if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
            res.status(403).send({ message: 'ban khong co quyen' });
            return;
        }
        if (!req.body.content || !req.body.content.trim()) {
            res.status(400).send({ message: 'noi dung khong duoc de trong' });
            return;
        }
        let updated = await commentController.UpdateAComment(req.params.commentId, req.body.content.trim());
        res.send(updated);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// DELETE /api/v1/tasks/:taskId/comments/:commentId - Xoá comment
router.delete('/:taskId/comments/:commentId', CheckLogin, async function (req, res, next) {
    try {
        let comment = await commentController.GetACommentById(req.params.commentId);
        if (!comment) {
            res.status(404).send({ message: 'comment khong ton tai' });
            return;
        }
        if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
            res.status(403).send({ message: 'ban khong co quyen' });
            return;
        }
        await commentController.DeleteAComment(req.params.commentId);
        res.send({ message: 'da xoa comment' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
