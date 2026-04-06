// public/js/layout.js
// Sidebar + notification + socket - dùng chung cho tất cả pages

function renderSidebar(activePage) {
    let user = getUser() || {};
    let initial = (user.fullName || user.username || 'U')[0].toUpperCase();
    let avatarHtml = user.avatarUrl
        ? `<img src="${user.avatarUrl}" alt="avatar">`
        : initial;

    let html = `
    <div class="sidebar">
      <div class="sidebar-logo">
        <h2>📋 Task Manager</h2>
        <p>Quản lý công việc nhóm</p>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-item ${activePage==='dashboard'?'active':''}" onclick="goto('dashboard')">
          <span class="icon">📊</span> Dashboard
        </div>
        <div class="nav-item ${activePage==='projects'?'active':''}" onclick="goto('projects')">
          <span class="icon">📁</span> Projects
        </div>
        <div class="nav-item ${activePage==='tasks'?'active':''}" onclick="goto('tasks')">
          <span class="icon">✅</span> Tasks
        </div>
        <div class="nav-item ${activePage==='profile'?'active':''}" onclick="goto('profile')">
          <span class="icon">👤</span> Hồ sơ
        </div>
        ${user.role === 'admin' ? `
        <div class="nav-item ${activePage==='users'?'active':''}" onclick="goto('users')">
          <span class="icon">👥</span> Users (Admin)
        </div>` : ''}
      </nav>
      <div class="sidebar-user">
        <div class="avatar">${avatarHtml}</div>
        <div class="user-info">
          <div class="name">${user.fullName || user.username || 'User'}</div>
          <div class="role">${user.role === 'admin' ? '⭐ Admin' : '👤 Member'}</div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="doLogout()" title="Đăng xuất">🚪</button>
      </div>
    </div>
    <!-- Notification bell -->
    <div style="position:fixed;top:16px;right:16px;z-index:200;display:flex;align-items:center;gap:12px;">
      <div class="notif-bell" onclick="toggleNotifPanel()" id="notifBell">
        🔔
        <span class="notif-count hidden" id="notifCount">0</span>
      </div>
    </div>
    <!-- Notification panel -->
    <div class="notif-panel hidden" id="notifPanel">
      <div class="notif-panel-header">
        🔔 Thông báo
        <button onclick="clearNotifs()" style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:12px;">Xoá tất cả</button>
      </div>
      <div id="notifList"><p style="padding:16px;color:#6b7280;font-size:13px;">Chưa có thông báo</p></div>
    </div>`;

    let wrap = document.getElementById('sidebarWrap');
    if (wrap) wrap.innerHTML = html;
}

function goto(page) {
    window.location.href = `/pages/${page}.html`;
}

async function doLogout() {
    try { await api('POST', '/auth/logout'); } catch {}
    clearToken();
    window.location.href = '/';
}

// ── NOTIFICATIONS ──
let notifications = [];

function toggleNotifPanel() {
    let panel = document.getElementById('notifPanel');
    panel.classList.toggle('hidden');
}

function addNotification(data) {
    notifications.unshift({ ...data, time: new Date() });
    renderNotifList();
    updateNotifCount();
    // Toast nhanh
    showToast(data.message, 'info');
}

function renderNotifList() {
    let list = document.getElementById('notifList');
    if (!list) return;
    if (notifications.length === 0) {
        list.innerHTML = '<p style="padding:16px;color:#6b7280;font-size:13px;">Chưa có thông báo</p>';
        return;
    }
    list.innerHTML = notifications.slice(0, 10).map(n => `
        <div class="notif-item">
          <div class="notif-msg">${n.message}</div>
          <div class="notif-time">${fmtDateTime(n.time)}</div>
        </div>`).join('');
}

function updateNotifCount() {
    let el = document.getElementById('notifCount');
    if (!el) return;
    if (notifications.length > 0) {
        el.textContent = notifications.length > 9 ? '9+' : notifications.length;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

function clearNotifs() {
    notifications = [];
    renderNotifList();
    updateNotifCount();
}

// ── SOCKET INIT ──
function initSocket() {
    let user = getUser();
    if (!user) return;

    let socket = io();

    // Join room của user để nhận notification
    socket.emit('join', user.id);

    // Nhận notification real-time
    socket.on('notification', function (data) {
        addNotification(data);
    });

    // Nhận comment mới (nếu đang xem task)
    socket.on('new_comment', function (comment) {
        if (window.onNewComment) window.onNewComment(comment);
    });

    // Nhận task update
    socket.on('task_updated', function (task) {
        if (window.onTaskUpdated) window.onTaskUpdated(task);
    });

    // Nhận task mới
    socket.on('new_task', function (task) {
        if (window.onNewTask) window.onNewTask(task);
    });

    return socket;
}

// Đóng notif panel khi click ngoài
document.addEventListener('click', function (e) {
    let panel = document.getElementById('notifPanel');
    let bell  = document.getElementById('notifBell');
    if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) {
        panel.classList.add('hidden');
    }
});
