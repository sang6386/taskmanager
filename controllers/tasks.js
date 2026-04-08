// controllers/tasks.js
let pool = require('../utils/database');

module.exports = {
    CreateATask: async function (title, description, priority, project_id, creator_id, assignee_id, deadline) {
        let [result] = await pool.query(
            'INSERT INTO tasks (title, description, priority, project_id, creator_id, assignee_id, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, description || null, priority || 'medium', project_id, creator_id, assignee_id || null, deadline || null]
        );
        return module.exports.GetATaskById(result.insertId);
    },

    GetATaskById: async function (id) {
        let [rows] = await pool.query(
            `SELECT t.*,
             p.name as project_name,
             creator.username as creator_username, creator.fullName as creator_name,
             assignee.username as assignee_username, assignee.fullName as assignee_name, assignee.avatarUrl as assignee_avatar
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             JOIN users creator ON t.creator_id = creator.id
             LEFT JOIN users assignee ON t.assignee_id = assignee.id
             WHERE t.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    GetAllTasks: async function ({ project_id, assignee_id, status, priority, search, sort, order, page, limit, deadline_before, deadline_after }) {
        let conditions = [];
        let params = [];

        if (project_id)      { conditions.push('t.project_id = ?');   params.push(project_id); }
        if (assignee_id)     { conditions.push('t.assignee_id = ?');  params.push(assignee_id); }
        if (status)          { conditions.push('t.status = ?');        params.push(status); }
        if (priority)        { conditions.push('t.priority = ?');      params.push(priority); }
        if (search)          { conditions.push('t.title LIKE ?');      params.push(`%${search}%`); }
        if (deadline_before) { conditions.push('t.deadline <= ?');     params.push(deadline_before); }
        if (deadline_after)  { conditions.push('t.deadline >= ?');     params.push(deadline_after); }

        let whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        let allowedSort = ['created_at', 'deadline', 'title', 'updated_at'];
        let sortField = allowedSort.includes(sort) ? `t.${sort}` : 't.created_at';
        let sortOrder = order === 'asc' ? 'ASC' : 'DESC';
        let offset = (page - 1) * limit;

        let [rows] = await pool.query(
            `SELECT t.*, p.name as project_name,
             creator.username as creator_username,
             assignee.username as assignee_username, assignee.avatarUrl as assignee_avatar
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             JOIN users creator ON t.creator_id = creator.id
             LEFT JOIN users assignee ON t.assignee_id = assignee.id
             ${whereClause}
             ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        let [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM tasks t ${whereClause}`, params
        );
        return { tasks: rows, total };
    },

    UpdateATask: async function (id, data) {
        let allowed = ['title', 'description', 'status', 'priority', 'assignee_id', 'deadline'];
        let updates = [];
        let values = [];
        Object.keys(data).forEach(key => {
            if (allowed.includes(key) && data[key] !== undefined) {
                updates.push(`${key} = ?`);
                values.push(data[key] === '' ? null : data[key]);
            }
        });
        if (data.status === 'done') updates.push('completed_at = NOW()');
        else if (data.status && data.status !== 'done') updates.push('completed_at = NULL');
        if (updates.length === 0) return module.exports.GetATaskById(id);
        values.push(id);
        await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
        return module.exports.GetATaskById(id);
    },

    DeleteATask: async function (id) {
        let [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    GetStats: async function (project_id) {
        let where = project_id ? 'WHERE project_id = ?' : '';
        let params = project_id ? [project_id] : [];
        let [byStatus]   = await pool.query(`SELECT status, COUNT(*) as count FROM tasks ${where} GROUP BY status`, params);
        let [byPriority] = await pool.query(`SELECT priority, COUNT(*) as count FROM tasks ${where} GROUP BY priority`, params);
        let [[overdue]]  = await pool.query(
            `SELECT COUNT(*) as count FROM tasks ${where ? where + ' AND' : 'WHERE'} deadline < CURDATE() AND status != 'done'`, params
        );
        return { by_status: byStatus, by_priority: byPriority, overdue: overdue.count };
    },

    // Upload đính kèm vào task
    AddAttachment: async function (task_id, user_id, file) {
        let [result] = await pool.query(
            'INSERT INTO task_attachments (task_id, user_id, filename, originalname, mimetype, size) VALUES (?, ?, ?, ?, ?, ?)',
            [task_id, user_id, file.filename, file.originalname, file.mimetype, file.size]
        );
        let [rows] = await pool.query(
            `SELECT ta.*, u.username FROM task_attachments ta JOIN users u ON ta.user_id = u.id WHERE ta.id = ?`,
            [result.insertId]
        );
        return rows[0];
    },

    GetAttachments: async function (task_id) {
        let [rows] = await pool.query(
            `SELECT ta.*, u.username FROM task_attachments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ? ORDER BY ta.created_at DESC`,
            [task_id]
        );
        return rows;
    }
};
