// routes/projects.js - CRUD + members
let express = require('express');
let router = express.Router();
let projectController = require('../controllers/projects');
let userController = require('../controllers/users');
let { CheckLogin, CheckRole } = require('../utils/authHandler');
let { CreateProjectValidator, validatedResult } = require('../utils/validator');

// GET /api/v1/projects
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let page   = parseInt(req.query.page)  || 1;
        let limit  = parseInt(req.query.limit) || 10;
        let status = req.query.status;
        let { projects, total } = await projectController.GetProjectsByUserId(req.user.id, page, limit, status);
        res.send({ projects, total, page, limit });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/projects/:id
router.get('/:id', CheckLogin, async function (req, res, next) {
    try {
        let project = await projectController.GetAProjectById(req.params.id);
        if (!project) {
            res.status(404).send({ message: 'id not found' });
            return;
        }
        let members = await projectController.GetMembers(req.params.id);
        res.send({ ...project, members });
    } catch (error) {
        res.status(404).send({ message: 'id not found' });
    }
});

// POST /api/v1/projects - Tạo project (dùng Transaction trong controller)
router.post('/', CheckLogin, CreateProjectValidator, validatedResult, async function (req, res, next) {
    try {
        let { name, description } = req.body;
        let project = await projectController.CreateAProject(name, description, req.user.id);
        res.send(project);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// PUT /api/v1/projects/:id
router.put('/:id', CheckLogin, async function (req, res, next) {
    try {
        let project = await projectController.GetAProjectById(req.params.id);
        if (!project) {
            res.status(404).send({ message: 'id not found' });
            return;
        }
        if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
            res.status(403).send({ message: 'ban khong co quyen' });
            return;
        }
        let updated = await projectController.UpdateAProject(req.params.id, req.body);
        res.send(updated);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// DELETE /api/v1/projects/:id
router.delete('/:id', CheckLogin, async function (req, res, next) {
    try {
        let project = await projectController.GetAProjectById(req.params.id);
        if (!project) {
            res.status(404).send({ message: 'id not found' });
            return;
        }
        if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
            res.status(403).send({ message: 'ban khong co quyen' });
            return;
        }
        await projectController.DeleteAProject(req.params.id);
        res.send({ message: 'da xoa project' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// GET /api/v1/projects/:id/members
router.get('/:id/members', CheckLogin, async function (req, res, next) {
    try {
        let members = await projectController.GetMembers(req.params.id);
        res.send(members);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// POST /api/v1/projects/:id/members - Thêm thành viên
router.post('/:id/members', CheckLogin, async function (req, res, next) {
    try {
        let { user_id, role } = req.body;
        let project = await projectController.GetAProjectById(req.params.id);
        if (!project) {
            res.status(404).send({ message: 'project khong ton tai' });
            return;
        }
        if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
            res.status(403).send({ message: 'ban khong co quyen' });
            return;
        }
        let targetUser = await userController.GetAnUserById(user_id);
        if (!targetUser) {
            res.status(404).send({ message: 'user khong ton tai' });
            return;
        }
        let existing = await projectController.IsMember(req.params.id, user_id);
        if (existing) {
            res.status(400).send({ message: 'user da la thanh vien' });
            return;
        }
        await projectController.AddMember(req.params.id, user_id, role);
        let members = await projectController.GetMembers(req.params.id);
        res.send(members);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

// DELETE /api/v1/projects/:id/members/:userId - Xoá thành viên
router.delete('/:id/members/:userId', CheckLogin, async function (req, res, next) {
    try {
        let project = await projectController.GetAProjectById(req.params.id);
        if (!project) {
            res.status(404).send({ message: 'project khong ton tai' });
            return;
        }
        if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
            res.status(403).send({ message: 'ban khong co quyen' });
            return;
        }
        if (parseInt(req.params.userId) === project.owner_id) {
            res.status(400).send({ message: 'khong the xoa owner' });
            return;
        }
        let removed = await projectController.RemoveMember(req.params.id, req.params.userId);
        if (!removed) {
            res.status(404).send({ message: 'thanh vien khong ton tai' });
            return;
        }
        res.send({ message: 'da xoa thanh vien' });
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;
