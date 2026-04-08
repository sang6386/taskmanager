// public/js/layout.js
function renderSidebar(activePage) {
    let user = getUser() || {};
    let initial = (user.fullName || user.username || 'U')[0].toUpperCase();
    let avatarHtml = user.avatarUrl
        ? `<img src="${user.avatarUrl}" alt="av" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : initial;
    let html = `
    <div class="sidebar">
      <div class="sidebar-logo"><h2>📋 Task Manager</h2><p>Quan ly cong viec nhom</p></div>
      <nav class="sidebar-nav">
        <div class="nav-item ${activePage==='dashboard'?'active':''}" onclick="goto('dashboard')"><span class="icon">📊</span> Dashboard</div>
        <div class="nav-item ${activePage==='projects'?'active':''}" onclick="goto('projects')"><span class="icon">📁</span> Projects</div>
        <div class="nav-item ${activePage==='tasks'?'active':''}" onclick="goto('tasks')"><span class="icon">✅</span> Tasks</div>
        <div class="nav-item ${activePage==='notifications'?'active':''}" onclick="goto('notifications')" style="display:flex;align-items:center;">
          <span class="icon">🔔</span> Thong bao
          <span id="sidebarUnread" class="hidden" style="background:#ef4444;color:white;border-radius:10px;padding:1px 7px;font-size:11px;font-weight:700;margin-left:auto;"></span>
        </div>
        <div class="nav-item ${activePage==='activity'?'active':''}" onclick="goto('activity')"><span class="icon">📜</span> Lich su</div>
        <div class="nav-item ${activePage==='profile'?'active':''}" onclick="goto('profile')"><span class="icon">👤</span> Ho so</div>
        ${user.role==='admin'?`<div class="nav-item ${activePage==='users'?'active':''}" onclick="goto('users')"><span class="icon">👥</span> Users (Admin)</div>`:''}
      </nav>
      <div class="sidebar-user">
        <div class="avatar">${avatarHtml}</div>
        <div class="user-info"><div class="name">${user.fullName||user.username||'User'}</div><div class="role">${user.role==='admin'?'⭐ Admin':'👤 Member'}</div></div>
        <button class="btn btn-sm btn-outline" onclick="doLogout()" title="Dang xuat">🚪</button>
      </div>
    </div>
    <div class="toast-wrap" id="toastWrap"></div>`;
    let wrap = document.getElementById('sidebarWrap');
    if (wrap) wrap.innerHTML = html;
    loadUnreadCount();
}
function goto(page) { window.location.href = `/pages/${page}.html`; }
async function doLogout() { try { await api('POST', '/auth/logout'); } catch {} clearToken(); window.location.href = '/'; }
async function loadUnreadCount() {
    try {
        let data = await api('GET', '/notifications/unread-count');
        let el = document.getElementById('sidebarUnread');
        if (!el) return;
        if (data.count > 0) { el.textContent = data.count > 9 ? '9+' : data.count; el.classList.remove('hidden'); }
        else el.classList.add('hidden');
    } catch {}
}
function showToast(message, type='success') {
    let wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    let t = document.createElement('div');
    t.className = `toast toast-${type}`; t.textContent = message;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
}
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('vi-VN'); }
function fmtDateTime(d) { if (!d) return ''; return new Date(d).toLocaleString('vi-VN'); }
function statusBadge(s) {
    let lb = {todo:'Todo',in_progress:'Dang lam',review:'Review',done:'Xong'};
    return `<span class="badge badge-${s}">${lb[s]||s}</span>`;
}
function priorityBadge(p) {
    let lb = {low:'Thap',medium:'TB',high:'Cao',urgent:'Khan'};
    return `<span class="badge badge-${p}">${lb[p]||p}</span>`;
}
function requireAuth() { if (!getToken()) { window.location.href='/'; return false; } return true; }
function requireGuest() { if (getToken()) window.location.href='/pages/dashboard.html'; }
function initSocket() {
    let user = getUser();
    if (!user) return null;
    let socket = io();
    socket.emit('join', user.id);
    socket.on('notification', function(data) {
        showToast(data.message, 'info');
        loadUnreadCount();
        if (window.onNewNotification) window.onNewNotification(data);
    });
    socket.on('new_comment', function(c) { if (window.onNewComment) window.onNewComment(c); });
    socket.on('task_updated', function(t) { if (window.onTaskUpdated) window.onTaskUpdated(t); });
    socket.on('new_task', function(t) {
        if (window.onNewTask) window.onNewTask(t);
        showToast('Task moi: ' + t.title, 'info');
        loadUnreadCount();
    });
    return socket;
}
