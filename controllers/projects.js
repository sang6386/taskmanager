// controllers/projects.js
let pool = require('../utils/database');

module.exports = {
    // Tạo project + tự thêm owner vào members (dùng Transaction)
    CreateAProject: async function (name, description, owner_id) {
        let connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            let [result] = await connection.query(
                'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
                [name, description || null, owner_id]
            );
            let projectId = result.insertId;

            // Transaction: tạo project + thêm member cùng lúc
            await connection.query(
                'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
                [projectId, owner_id, 'owner']
            );

            await connection.commit();
            return module.exports.GetAProjectById(projectId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    GetAProjectById: async function (id) {
        let [rows] = await pool.query(
            `SELECT p.*, u.username as owner_username, u.fullName as owner_name,
             (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
             (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
             FROM projects p JOIN users u ON p.owner_id = u.id
             WHERE p.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    GetProjectsByUserId: async function (userId, page, limit, status) {
        let offset = (page - 1) * limit;
        let params = [userId];
        let statusFilter = '';
        if (status) { statusFilter = 'AND p.status = ?'; params.push(status); }

        let [rows] = await pool.query(
            `SELECT p.*, u.username as owner_username, pm.role as my_role,
             (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
             FROM projects p
             JOIN users u ON p.owner_id = u.id
             JOIN project_members pm ON p.id = pm.project_id
             WHERE pm.user_id = ? ${statusFilter}
             ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        let [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM projects p
             JOIN project_members pm ON p.id = pm.project_id WHERE pm.user_id = ?`,
            [userId]
        );
        return { projects: rows, total };
    },

    UpdateAProject: async function (id, data) {
        let allowed = ['name', 'description', 'status'];
        let updates = [];
        let values = [];
        Object.keys(data).forEach(key => {
            if (allowed.includes(key) && data[key] !== undefined) {
                updates.push(`${key} = ?`); values.push(data[key]);
            }
        });
        if (updates.length === 0) return module.exports.GetAProjectById(id);
        values.push(id);
        await pool.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
        return module.exports.GetAProjectById(id);
    },

    DeleteAProject: async function (id) {
        let [result] = await pool.query('DELETE FROM projects WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    GetMembers: async function (projectId) {
        let [rows] = await pool.query(
            `SELECT u.id, u.username, u.fullName, u.email, u.avatarUrl, pm.role, pm.joined_at
             FROM project_members pm JOIN users u ON pm.user_id = u.id
             WHERE pm.project_id = ? ORDER BY pm.joined_at ASC`,
            [projectId]
        );
        return rows;
    },

    AddMember: async function (projectId, userId, role) {
        await pool.query(
            'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
            [projectId, userId, role || 'editor']
        );
        return true;
    },

    RemoveMember: async function (projectId, userId) {
        let [result] = await pool.query(
            'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
            [projectId, userId]
        );
        return result.affectedRows > 0;
    },

    IsMember: async function (projectId, userId) {
        let [rows] = await pool.query(
            'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
            [projectId, userId]
        );
        return rows[0] || null;
    }
};
