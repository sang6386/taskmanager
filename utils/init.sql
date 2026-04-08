-- Task Manager V2 - Database Schema
-- Chạy file này để tạo/reset database

CREATE DATABASE IF NOT EXISTS task_manager_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE task_manager_db;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS task_attachments;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- Bảng users - có avatar, role, lockTime giống thầy
CREATE TABLE users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  username    VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  fullName    VARCHAR(200) DEFAULT '',
  avatarUrl   VARCHAR(500) DEFAULT '',
  role        ENUM('admin','member') DEFAULT 'member',
  is_active   TINYINT(1) DEFAULT 1,
  loginCount  INT DEFAULT 0,
  lockTime    BIGINT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng projects
CREATE TABLE projects (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  owner_id    INT NOT NULL,
  status      ENUM('active','completed','archived') DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng project_members - quan hệ nhiều nhiều
CREATE TABLE project_members (
  project_id  INT NOT NULL,
  user_id     INT NOT NULL,
  role        ENUM('owner','editor','viewer') DEFAULT 'editor',
  joined_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

-- Bảng tasks
CREATE TABLE tasks (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  title        VARCHAR(300) NOT NULL,
  description  TEXT,
  status       ENUM('todo','in_progress','review','done') DEFAULT 'todo',
  priority     ENUM('low','medium','high','urgent') DEFAULT 'medium',
  project_id   INT NOT NULL,
  creator_id   INT NOT NULL,
  assignee_id  INT,
  deadline     DATE,
  completed_at TIMESTAMP,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id)  REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id)    ON DELETE SET NULL
);

-- Bảng task_attachments - file đính kèm vào task (chức năng upload)
CREATE TABLE task_attachments (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  task_id     INT NOT NULL,
  user_id     INT NOT NULL,
  filename    VARCHAR(500) NOT NULL,
  originalname VARCHAR(500) NOT NULL,
  mimetype    VARCHAR(100),
  size        INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng comments - có socket real-time
CREATE TABLE comments (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  task_id    INT NOT NULL,
  user_id    INT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index tăng tốc query
CREATE INDEX idx_tasks_project   ON tasks(project_id);
CREATE INDEX idx_tasks_assignee  ON tasks(assignee_id);
CREATE INDEX idx_tasks_status    ON tasks(status);
CREATE INDEX idx_comments_task   ON comments(task_id);

-- Dữ liệu mẫu (password = "Password1!")
INSERT INTO users (username, password, email, fullName, role) VALUES
('admin',   '$2b$10$MDm/ahcoX5pQP0fgV6M2vu4uosPGiOi.qis8ItTA/ejcW4VbFmu8G', 'admin@example.com',  'Admin User',   'admin'),
('alice',   '$2b$10$MDm/ahcoX5pQP0fgV6M2vu4uosPGiOi.qis8ItTA/ejcW4VbFmu8G', 'alice@example.com',  'Alice Nguyen', 'member'),
('bob',     '$2b$10$MDm/ahcoX5pQP0fgV6M2vu4uosPGiOi.qis8ItTA/ejcW4VbFmu8G', 'bob@example.com',    'Bob Tran',     'member');

INSERT INTO projects (name, description, owner_id) VALUES
('Website Redesign', 'Thiet ke lai giao dien website', 1),
('Mobile App v2',    'Phat trien ung dung di dong v2', 2);

INSERT INTO project_members (project_id, user_id, role) VALUES
(1, 1, 'owner'), (1, 2, 'editor'), (1, 3, 'viewer'),
(2, 2, 'owner'), (2, 3, 'editor');

INSERT INTO tasks (title, description, status, priority, project_id, creator_id, assignee_id, deadline) VALUES
('Thiet ke UI trang chu', 'Tao mockup landing page', 'in_progress', 'high',   1, 1, 2, '2025-12-31'),
('Viet API authentication', 'JWT endpoints',         'todo',        'urgent', 1, 1, 3, '2025-12-25'),
('Setup CI/CD',            'GitHub Actions config',  'done',        'medium', 2, 2, 2, '2025-12-20'),
('Fix bug login',          'Loi khong redirect',     'review',      'high',   2, 3, 3, '2025-12-22');

-- =============================================
-- BẢNG 7: notifications - Lưu thông báo vào DB
-- (Socket chỉ gửi real-time, bảng này lưu lịch sử)
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  type        ENUM('task_assigned','task_status_changed','new_comment','project_invited','system') DEFAULT 'system',
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  is_read     TINYINT(1) DEFAULT 0,
  ref_type    VARCHAR(50),   -- 'task' | 'project' | 'comment'
  ref_id      INT,           -- ID tham chiếu đến object liên quan
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- BẢNG 8: activity_logs - Lịch sử hoạt động
-- Ghi lại mọi thao tác quan trọng trong hệ thống
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  action      VARCHAR(100) NOT NULL,  -- 'create_task','update_status','add_comment'...
  target_type VARCHAR(50)  NOT NULL,  -- 'task','project','comment','user'
  target_id   INT          NOT NULL,
  description TEXT,                   -- Mô tả chi tiết hành động
  meta        JSON,                   -- Dữ liệu bổ sung (old_value, new_value...)
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notif_user   ON notifications(user_id, is_read);
CREATE INDEX idx_actlog_user  ON activity_logs(user_id);
CREATE INDEX idx_actlog_target ON activity_logs(target_type, target_id);

-- Dữ liệu mẫu notifications
INSERT INTO notifications (user_id, type, title, message, ref_type, ref_id) VALUES
(2, 'task_assigned',       'Task moi duoc giao',     'Ban duoc giao task: Thiet ke UI trang chu', 'task', 1),
(3, 'task_assigned',       'Task moi duoc giao',     'Ban duoc giao task: Viet API authentication', 'task', 2),
(1, 'new_comment',         'Binh luan moi',          'Alice da binh luan vao task cua ban',       'task', 1),
(2, 'task_status_changed', 'Cap nhat trang thai',    'Task Setup CI/CD da chuyen sang: done',     'task', 3);

-- Dữ liệu mẫu activity_logs
INSERT INTO activity_logs (user_id, action, target_type, target_id, description) VALUES
(1, 'create_project', 'project', 1, 'Tao project: Website Redesign'),
(2, 'create_project', 'project', 2, 'Tao project: Mobile App v2'),
(1, 'create_task',    'task',    1, 'Tao task: Thiet ke UI trang chu'),
(1, 'create_task',    'task',    2, 'Tao task: Viet API authentication'),
(2, 'update_status',  'task',    3, 'Cap nhat trang thai task: Setup CI/CD -> done'),
(3, 'create_task',    'task',    4, 'Tao task: Fix bug login');
