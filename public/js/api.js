// public/js/api.js
const BASE = '/api/v1';

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function getUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Hàm gọi API chung
async function api(method, path, body = null, isFormData = false) {
    let options = {
        method,
        headers: {}
    };
    let token = getToken();
    if (token) options.headers['Authorization'] = 'Bearer ' + token;

    if (body) {
        if (isFormData) {
            options.body = body; // FormData
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    let res = await fetch(BASE + path, options);
    let data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Có lỗi xảy ra');
    return data;
}

// Toast notification
function showToast(message, type = 'success') {
    let wrap = document.getElementById('toastWrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'toastWrap';
        wrap.className = 'toast-wrap';
        document.body.appendChild(wrap);
    }
    let toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Format date
function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
}

function fmtDateTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleString('vi-VN');
}

// Badge HTML
function statusBadge(s) {
    let label = { todo: 'Todo', in_progress: 'Đang làm', review: 'Review', done: 'Xong' };
    return `<span class="badge badge-${s}">${label[s] || s}</span>`;
}

function priorityBadge(p) {
    let label = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' };
    return `<span class="badge badge-${p}">${label[p] || p}</span>`;
}

// Guard: redirect nếu chưa đăng nhập
function requireAuth() {
    if (!getToken()) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// Guard: redirect nếu đã đăng nhập
function requireGuest() {
    if (getToken()) {
        window.location.href = '/pages/dashboard.html';
    }
}
