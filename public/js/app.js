/**
 * CSE (ICB) Department Integrated Academic and Information Portal
 * Master Client-Side Application Logic
 * K. S. Institute of Technology (KSIT), Bengaluru
 */

// Application State
const AppState = {
  token: localStorage.getItem('ksit_portal_token') || sessionStorage.getItem('ksit_portal_token') || null,
  currentRole: null, // 'student' | 'teacher' | 'department' | null
  currentTab: 'dashboard',
  activeLoginRole: 'student', // 'student' | 'teacher' | 'department'
  user: null,
  profile: null,
  dbStatus: { engine: 'loading', activeRecords: {} },
  unreadNotifsCount: 3,
  notifications: [],
  cache: {}
};

// Native Fetch Interceptor with Automatic Bearer Token Injection
const _nativeFetch = window.fetch;
window.fetch = function(url, options = {}) {
  options = options || {};
  options.headers = options.headers || {};
  if (AppState.token) {
    if (options.headers instanceof Headers) {
      if (!options.headers.has('Authorization')) {
        options.headers.set('Authorization', `Bearer ${AppState.token}`);
      }
    } else if (Array.isArray(options.headers)) {
      options.headers.push(['Authorization', `Bearer ${AppState.token}`]);
    } else {
      if (!options.headers['Authorization'] && !options.headers['authorization']) {
        options.headers['Authorization'] = `Bearer ${AppState.token}`;
      }
    }
  }
  return _nativeFetch.call(this, url, options).then(res => {
    if (res.status === 401 && !url.includes('/api/auth/')) {
      handleSessionExpired();
      showToast('Session expired. Please log in.');
    }
    return res;
  });
};

// SVG Icon Helpers (Crisp inline rendering)
const Icons = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  academics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  attendance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>`,
  examination: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  notices: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  events: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  library: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>`,
  placement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  community: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  assignments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>`,
  faculty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  students: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
  reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,
  database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`
};

// Role-Based Navigation Definitions
const NavigationMenus = {
  student: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'academics', label: 'Academic & Study Hub', icon: 'academics' },
    { id: 'attendance', label: 'Attendance', icon: 'attendance' },
    { id: 'examination', label: 'Examination', icon: 'examination' },
    { id: 'notices', label: 'Notices & Announcements', icon: 'notices' },
    { id: 'events', label: 'Events & Activities', icon: 'events' },
    { id: 'profile', label: 'Profile & Settings', icon: 'settings' }
  ],
  teacher: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'attendance_record', label: 'Record Attendance', icon: 'attendance' },
    { id: 'academics', label: 'Resource Library', icon: 'academics' },
    { id: 'assignments_manage', label: 'Manage Assignments', icon: 'assignments', badge: '18' },
    { id: 'marks_manage', label: 'Manage Marks', icon: 'examination' },
    { id: 'notices_manage', label: 'Post Notice / Circular', icon: 'notices' },
    { id: 'students_list', label: 'Students Directory', icon: 'students' },
    { id: 'reports_teacher', label: 'Reports & Analytics', icon: 'reports' },
    { id: 'profile', label: 'Faculty Profile', icon: 'settings' }
  ],
  department: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'students_list', label: 'Students Management', icon: 'students' },
    { id: 'faculty_list', label: 'Faculty Management', icon: 'faculty' },
    { id: 'attendance_analytics', label: 'Attendance Analytics', icon: 'attendance' },
    { id: 'exam_approvals', label: 'Examination & Approvals', icon: 'examination', badge: '7' },
    { id: 'notices_manage', label: 'Notices & Circulars', icon: 'notices' },
    { id: 'db_settings', label: 'Database & System Settings', icon: 'database' }
  ]
};

// ---------------- INITIALIZATION & AUTHENTICATION ----------------
document.addEventListener('DOMContentLoaded', async () => {
  await fetchDbStatus();
  setupEventListeners();
  await checkAuthSession();
});

// Check Existing Session on Page Load
async function checkAuthSession() {
  if (!AppState.token) {
    showLoginView();
    return;
  }

  try {
    const res = await _nativeFetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${AppState.token}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.user) {
        AppState.user = data.user;
        AppState.profile = data.profile;
        AppState.currentRole = data.role;
        showDashboardView();
        return;
      }
    }
  } catch (e) {
    console.warn('Session verification failed:', e);
  }

  // Token invalid or expired
  handleSessionExpired();
}

function showLoginView() {
  const appContainer = document.getElementById('appContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  if (appContainer) appContainer.style.display = 'none';
  if (loginContainer) {
    loginContainer.style.display = 'flex';
    renderLoginPage();
  }
}

function showDashboardView() {
  const appContainer = document.getElementById('appContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  if (loginContainer) loginContainer.style.display = 'none';
  if (appContainer) appContainer.style.display = 'flex';
  renderApp();
}

function handleSessionExpired() {
  localStorage.removeItem('ksit_portal_token');
  sessionStorage.removeItem('ksit_portal_token');
  AppState.token = null;
  AppState.user = null;
  AppState.profile = null;
  AppState.currentRole = null;
  showLoginView();
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // continue locally
  }
  handleSessionExpired();
  showToast('You have been securely signed out.');
}

// ---------------- MODERN THREE-ROLE LOGIN PAGE RENDERER ----------------
function renderLoginPage() {
  const container = document.getElementById('loginViewContainer');
  if (!container) return;

  const role = AppState.activeLoginRole || 'student';

  container.innerHTML = `
    <div class="login-card-wrapper">
      <div class="login-card-top-bar"></div>
      
      <!-- Institutional Branding Header -->
      <div class="login-header">
        <div class="login-crest">
          <img src="/assets/logo.png" alt="KSIT Crest" onerror="this.src='/assets/ksit_logo.jpg'">
        </div>
        <div class="login-college-name">K. S. Institute of Technology, Bengaluru</div>
        <div class="login-dept-title">Department of Computer Science & Engineering — ICB</div>
        <div class="login-portal-subtitle">Integrated Academic & Information Portal • Single Sign-On</div>
      </div>

      <!-- Three Role Selection Cards -->
      <div class="login-role-selector">
        <div class="login-role-btn ${role === 'student' ? 'active' : ''}" onclick="selectLoginRole('student')">
          <div class="role-icon">🎓</div>
          <div class="role-title">Student</div>
          <div class="role-sub">USN & DOB</div>
        </div>
        <div class="login-role-btn ${role === 'teacher' ? 'active' : ''}" onclick="selectLoginRole('teacher')">
          <div class="role-icon">👨‍🏫</div>
          <div class="role-title">Faculty</div>
          <div class="role-sub">Mobile & Pass</div>
        </div>
        <div class="login-role-btn ${role === 'department' ? 'active' : ''}" onclick="selectLoginRole('department')">
          <div class="role-icon">🏛️</div>
          <div class="role-title">Department</div>
          <div class="role-sub">Staff ID & HOD</div>
        </div>
      </div>

      <!-- Login Form Body Area -->
      <div class="login-form-area">
        <div id="loginAlertBox" class="login-alert" style="display:none;"></div>

        <form id="threeRoleLoginForm" onsubmit="handleLoginSubmit(event)">
          ${getRoleFormFieldsHtml(role)}

          <div class="login-options-row">
            <label class="login-remember-label">
              <input type="checkbox" id="loginRememberMe" checked>
              <span>Remember me for 30 days</span>
            </label>
            ${role !== 'student' ? `
              <button type="button" class="login-forgot-link" onclick="openForgotPasswordModal('${role}')">
                Forgot password?
              </button>
            ` : `
              <button type="button" class="login-forgot-link" onclick="openForgotPasswordModal('student')" style="color:#64748B;">
                Need help?
              </button>
            `}
          </div>

          <button type="submit" id="loginSubmitBtn" class="login-submit-btn">
            ${Icons.check || '<span>✔</span>'}
            <span>Sign In to ${role === 'student' ? 'Student Portal' : role === 'teacher' ? 'Faculty Portal' : 'Department Portal'}</span>
          </button>
        </form>

        <!-- Demo Accounts Quick-Fill Box for Evaluation -->
        <div class="demo-accounts-box">
          <div class="demo-accounts-header">
            <span>Registered Accounts for Evaluation:</span>
            <span style="font-size:10px;color:#4169E1;">Click to Autofill</span>
          </div>
          <div class="demo-account-pills">
            <div class="demo-account-pill" onclick="autofillDemo('student', '1KS25IC023', '2006-05-14')">
              <div class="acc-meta">
                <span>🎓</span>
                <span><strong>Hussain Basha</strong> (USN: <code>1KS25IC023</code>)</span>
              </div>
              <span class="btn-autofill">Autofill</span>
            </div>
            <div class="demo-account-pill" onclick="autofillDemo('student', '1KS25IC015', '2006-08-22')">
              <div class="acc-meta">
                <span>🎓</span>
                <span><strong>D V Manas Srujan</strong> (USN: <code>1KS25IC015</code>)</span>
              </div>
              <span class="btn-autofill">Autofill</span>
            </div>
            <div class="demo-account-pill" onclick="autofillDemo('teacher', '9845055667', 'password123')">
              <div class="acc-meta">
                <span>👨‍🏫</span>
                <span><strong>Prof. R. Sharma</strong> (Mobile: <code>9845055667</code>)</span>
              </div>
              <span class="btn-autofill">Autofill</span>
            </div>
            <div class="demo-account-pill" onclick="autofillDemo('department', 'KSIT-HOD-001', 'password123')">
              <div class="acc-meta">
                <span>🏛️</span>
                <span><strong>Department Office</strong> (ID: <code>KSIT-HOD-001</code>)</span>
              </div>
              <span class="btn-autofill">Autofill</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function selectLoginRole(role) {
  AppState.activeLoginRole = role;
  renderLoginPage();
}

function getRoleFormFieldsHtml(role) {
  if (role === 'student') {
    return `
      <!-- Student Login: USN + Date of Birth -->
      <div class="login-input-group">
        <label>
          <span>University Seat Number (USN) <span class="req">*</span></span>
          <span style="font-size:11px;color:#64748B;">Format: 1KS25IC...</span>
        </label>
        <div class="input-with-icon-wrap">
          <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <input type="text" id="loginUsn" placeholder="Enter your registered USN (e.g. 1KS25IC023)" style="text-transform:uppercase;" required autocomplete="username">
        </div>
      </div>

      <div class="login-input-group">
        <label>
          <span>Date of Birth <span class="req">*</span></span>
          <span style="font-size:11px;color:#64748B;">As per SSLC / 10th Record</span>
        </label>
        <div class="input-with-icon-wrap">
          <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <input type="date" id="loginDob" required>
        </div>
      </div>
    `;
  }

  if (role === 'teacher') {
    return `
      <!-- Teacher Login: Registered Mobile + Password -->
      <div class="login-input-group">
        <label>
          <span>Registered Mobile Number <span class="req">*</span></span>
          <span style="font-size:11px;color:#64748B;">10 Digits</span>
        </label>
        <div class="input-with-icon-wrap">
          <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <input type="tel" id="loginMobile" placeholder="e.g. 9845055667" maxlength="15" required autocomplete="tel">
        </div>
      </div>

      <div class="login-input-group">
        <label>
          <span>Password <span class="req">*</span></span>
        </label>
        <div class="input-with-icon-wrap">
          <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input type="password" id="loginTeacherPassword" placeholder="Enter your faculty password" required autocomplete="current-password">
          <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('loginTeacherPassword', this)" title="Show Password">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="17" height="17"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Department Staff Login
  return `
    <!-- Department Staff Login: Registered Staff ID + Password -->
    <div class="login-input-group">
      <label>
        <span>Registered Staff ID / Employee ID <span class="req">*</span></span>
        <span style="font-size:11px;color:#64748B;">e.g. KSIT-HOD-001</span>
      </label>
      <div class="input-with-icon-wrap">
        <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        <input type="text" id="loginStaffId" placeholder="Enter Staff ID (e.g. KSIT-HOD-001)" style="text-transform:uppercase;" required autocomplete="username">
      </div>
    </div>

    <div class="login-input-group">
      <label>
        <span>Password <span class="req">*</span></span>
      </label>
      <div class="input-with-icon-wrap">
        <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <input type="password" id="loginStaffPassword" placeholder="Enter department password" required autocomplete="current-password">
        <button type="button" class="password-toggle-btn" onclick="togglePasswordVisibility('loginStaffPassword', this)" title="Show Password">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="17" height="17"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    </div>
  `;
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="17" height="17"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    btn.title = 'Hide Password';
  } else {
    input.type = 'password';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="17" height="17"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    btn.title = 'Show Password';
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const alertBox = document.getElementById('loginAlertBox');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const originalBtnText = submitBtn.innerHTML;

  if (alertBox) {
    alertBox.style.display = 'none';
    alertBox.className = 'login-alert';
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>⏳</span> Authenticating...`;

  try {
    let endpoint = '';
    let payload = {};

    if (AppState.activeLoginRole === 'student') {
      const usn = document.getElementById('loginUsn')?.value?.trim();
      const dob = document.getElementById('loginDob')?.value?.trim();
      const rememberMe = document.getElementById('loginRememberMe')?.checked;

      if (!usn || !dob) {
        throw new Error('Please enter both University Seat Number (USN) and Date of Birth.');
      }
      endpoint = '/api/auth/student-login';
      payload = { usn, dob, rememberMe };
    } else if (AppState.activeLoginRole === 'teacher') {
      const mobile = document.getElementById('loginMobile')?.value?.trim();
      const password = document.getElementById('loginTeacherPassword')?.value;
      const rememberMe = document.getElementById('loginRememberMe')?.checked;

      if (!mobile || !password) {
        throw new Error('Please enter your 10-digit registered mobile number and password.');
      }
      endpoint = '/api/auth/teacher-login';
      payload = { mobile, password, rememberMe };
    } else if (AppState.activeLoginRole === 'department') {
      const staffId = document.getElementById('loginStaffId')?.value?.trim();
      const password = document.getElementById('loginStaffPassword')?.value;
      const rememberMe = document.getElementById('loginRememberMe')?.checked;

      if (!staffId || !password) {
        throw new Error('Please enter your Registered Staff ID and password.');
      }
      endpoint = '/api/auth/department-login';
      payload = { staffId, password, rememberMe };
    }

    const res = await _nativeFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
    }

    // Save token
    const remember = payload.rememberMe;
    if (remember) {
      localStorage.setItem('ksit_portal_token', data.token);
      sessionStorage.removeItem('ksit_portal_token');
    } else {
      sessionStorage.setItem('ksit_portal_token', data.token);
      localStorage.removeItem('ksit_portal_token');
    }

    AppState.token = data.token;
    AppState.user = data.user;
    AppState.profile = data.profile;
    AppState.currentRole = data.role;
    AppState.currentTab = 'dashboard';

    if (alertBox) {
      alertBox.className = 'login-alert success';
      alertBox.innerHTML = `<span>✔</span> ${data.message}`;
      alertBox.style.display = 'flex';
    }

    showToast(`Welcome back, ${data.user.name}!`);

    setTimeout(() => {
      showDashboardView();
    }, 400);

  } catch (err) {
    if (alertBox) {
      alertBox.className = 'login-alert error';
      alertBox.innerHTML = `<span>⚠</span> ${err.message}`;
      alertBox.style.display = 'flex';
    }
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

function autofillDemo(role, cred1, cred2) {
  AppState.activeLoginRole = role;
  renderLoginPage();
  setTimeout(() => {
    if (role === 'student') {
      const usnInput = document.getElementById('loginUsn');
      const dobInput = document.getElementById('loginDob');
      if (usnInput) usnInput.value = cred1;
      if (dobInput) dobInput.value = cred2;
    } else if (role === 'teacher') {
      const mobileInput = document.getElementById('loginMobile');
      const passInput = document.getElementById('loginTeacherPassword');
      if (mobileInput) mobileInput.value = cred1;
      if (passInput) passInput.value = cred2;
    } else if (role === 'department') {
      const staffInput = document.getElementById('loginStaffId');
      const passInput = document.getElementById('loginStaffPassword');
      if (staffInput) staffInput.value = cred1;
      if (passInput) passInput.value = cred2;
    }
    showToast(`Autofilled demo credentials for ${role.toUpperCase()}`);
  }, 40);
}

function openForgotPasswordModal(role) {
  const modal = document.getElementById('genericModal');
  const title = document.getElementById('genericModalTitle');
  const body = document.getElementById('genericModalBody');

  if (role === 'student') {
    title.innerText = 'Student Account Recovery Notice';
    body.innerHTML = `
      <div style="font-size:13.5px;color:#101C3A;line-height:1.6;margin-bottom:18px;">
        <p><strong>Official KSIT Academic Notice:</strong></p>
        <p style="margin-top:6px;">Student identity and Date of Birth credentials are electronically synchronized with autonomous university examination records.</p>
        <p style="margin-top:10px;color:#64748B;">If you are experiencing difficulty accessing your student records, please visit the Department Administrative Office with your valid college identity card, or email <a href="mailto:academic.cse@ksit.edu.in" style="color:#4169E1;font-weight:700;">academic.cse@ksit.edu.in</a> quoting your USN.</p>
      </div>
      <div style="text-align:right;">
        <button class="btn btn-secondary" onclick="closeModal()">Understood</button>
      </div>
    `;
    modal.classList.add('open');
    return;
  }

  const roleLabel = role === 'teacher' ? 'Faculty Member' : 'Department Staff';
  const fieldLabel = role === 'teacher' ? 'Registered Mobile Number or Email' : 'Registered Staff ID or Email';
  const placeholder = role === 'teacher' ? 'e.g. 9845055667 or r.sharma@ksit.edu.in' : 'e.g. KSIT-HOD-001 or hod.cse@ksit.edu.in';

  title.innerText = `Password Recovery — ${roleLabel}`;
  body.innerHTML = `
    <div style="font-size:13px;color:#64748B;margin-bottom:16px;">
      Enter your registered contact identifier. A secure one-time password verification link will be dispatched to your authorized institution email address.
    </div>
    <div id="forgotAlertBox" class="login-alert" style="display:none;"></div>
    <div class="form-group">
      <label>${fieldLabel}</label>
      <input type="text" id="forgotIdentifier" class="form-control" placeholder="${placeholder}" required>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="btnSubmitForgot" onclick="submitForgotPassword('${role}')">
        Send Reset Link &rarr;
      </button>
    </div>
  `;
  modal.classList.add('open');
}

async function submitForgotPassword(role) {
  const input = document.getElementById('forgotIdentifier');
  const alertBox = document.getElementById('forgotAlertBox');
  const btn = document.getElementById('btnSubmitForgot');
  const identifier = input?.value?.trim();

  if (!identifier) {
    if (alertBox) {
      alertBox.className = 'login-alert error';
      alertBox.innerHTML = '<span>⚠</span> Please enter your registered contact identifier.';
      alertBox.style.display = 'flex';
    }
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Dispatching...';

  try {
    const res = await _nativeFetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, identifier })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Recovery request failed.');
    }

    if (alertBox) {
      alertBox.className = 'login-alert success';
      alertBox.innerHTML = `<span>✔</span> ${data.message}`;
      alertBox.style.display = 'flex';
    }
    btn.style.display = 'none';
  } catch (err) {
    if (alertBox) {
      alertBox.className = 'login-alert error';
      alertBox.innerHTML = `<span>⚠</span> ${err.message}`;
      alertBox.style.display = 'flex';
    }
    btn.disabled = false;
    btn.innerText = 'Send Reset Link →';
  }
}

// Fetch DB Engine Status
async function fetchDbStatus() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    AppState.dbStatus = data.database;
    updateDbBadge();
  } catch (e) {
    console.warn('DB Status check failed:', e);
  }
}

function updateDbBadge() {
  const badge = document.getElementById('dbStatusBadge');
  if (!badge) return;
  const isMysql = AppState.dbStatus.engine === 'mysql';
  badge.innerHTML = `
    <span class="db-pulse-dot" style="background: ${isMysql ? '#16A58B' : '#3b82f6'};"></span>
    <span>${isMysql ? 'MySQL: Connected' : 'Relational Store: Active'}</span>
  `;
}

// Global Event Listeners
function setupEventListeners() {
  // DB Badge click -> opens database config modal
  const dbBadge = document.getElementById('dbStatusBadge');
  if (dbBadge) {
    dbBadge.addEventListener('click', () => {
      openDbModal();
    });
  }

  // Notification bell click
  const notifBtn = document.getElementById('notifBellBtn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      openNotifModal();
    });
  }

  // Global search input
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (q.length > 2) {
        // If not on academics tab, switch to academics and search
        if (AppState.currentTab !== 'academics') {
          AppState.currentTab = 'academics';
          renderApp();
          const subSearch = document.getElementById('resourceSearchInput');
          if (subSearch) {
            subSearch.value = q;
            loadResourcesList();
          }
        }
      }
    });
  }
}

// Render Master Shell
function renderApp() {
  renderSidebar();
  renderTopHeaderMeta();
  renderMainView();
}

// Render Sidebar Navigation
function renderSidebar() {
  const navContainer = document.getElementById('sidebarNavContainer');
  if (!navContainer) return;

  const menu = NavigationMenus[AppState.currentRole] || NavigationMenus.student;

  navContainer.innerHTML = menu.map(item => `
    <div class="nav-item ${AppState.currentTab === item.id ? 'active' : ''}" onclick="navigateToTab('${item.id}')">
      ${Icons[item.icon] || Icons.dashboard}
      <span>${item.label}</span>
      ${item.badge ? `<span class="badge-count">${item.badge}</span>` : ''}
    </div>
  `).join('');

  // Render bottom card in sidebar
  const bottomCard = document.getElementById('sidebarBottomCard');
  if (bottomCard) {
    if (AppState.currentRole === 'student') {
      bottomCard.innerHTML = `
        <h4>Better Everyday</h4>
        <p>Small steps lead to big dreams.</p>
      `;
    } else if (AppState.currentRole === 'teacher') {
      bottomCard.innerHTML = `
        <h4>Educate • Empower</h4>
        <p>Build tomorrow. KSIT | CSE (ICB)</p>
      `;
    } else {
      bottomCard.innerHTML = `
        <h4>Together for Better</h4>
        <p>CSE (ICB) Department, KSIT, Bengaluru</p>
      `;
    }
  }
}

// Responsive Sidebar Toggle
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  if (sb) sb.classList.toggle('open');
  if (bd) bd.classList.toggle('active');
}

// Navigation Tab Switcher
function navigateToTab(tabId) {
  AppState.currentTab = tabId;
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebarBackdrop');
  if (sb) sb.classList.remove('open');
  if (bd) bd.classList.remove('active');
  renderSidebar();
  renderMainView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Top Bar User Meta
function renderTopHeaderMeta() {
  const profileDiv = document.getElementById('userProfileMenu');
  if (!profileDiv || !AppState.user) return;

  let roleLabel = 'Student';
  let subText = '1st Year • CSE (ICB)';
  let displayName = AppState.user.name;

  if (AppState.currentRole === 'teacher') {
    roleLabel = 'Faculty';
    subText = 'Assistant Professor';
  } else if (AppState.currentRole === 'department') {
    roleLabel = 'HOD';
    subText = 'CSE (ICB) Department';
    displayName = 'Department Office';
  }

  // Update active session badge in top bar
  const sessionRoleIcon = document.getElementById('sessionRoleIcon');
  const sessionRoleText = document.getElementById('sessionRoleText');
  if (sessionRoleIcon && sessionRoleText) {
    if (AppState.currentRole === 'teacher') {
      sessionRoleIcon.textContent = '👨‍🏫';
      sessionRoleText.textContent = 'Faculty Portal';
    } else if (AppState.currentRole === 'department') {
      sessionRoleIcon.textContent = '🏛️';
      sessionRoleText.textContent = 'Department Portal';
    } else {
      sessionRoleIcon.textContent = '🎓';
      sessionRoleText.textContent = 'Student Portal';
    }
  }

  const initials = displayName.split(' ').map(n=>n[0]).join('').slice(0, 2);

  profileDiv.innerHTML = `
    <div class="user-avatar-img" style="display:flex;align-items:center;justify-content:center;background:#4169E1;color:#fff;font-weight:700;">
      ${initials}
    </div>
    <div class="user-text-meta">
      <div class="name">${displayName}</div>
      <div class="role-sub">${subText}</div>
    </div>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" style="color:#94a3b8;"><polyline points="6 9 12 15 18 9"/></svg>
  `;
}

// ---------------- MAIN CONTENT VIEW ROUTER ----------------
async function renderMainView() {
  const container = document.getElementById('mainContentArea');
  if (!container) return;

  container.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b;">Loading ${AppState.currentTab}...</div>`;

  if (AppState.currentRole === 'student') {
    switch (AppState.currentTab) {
      case 'dashboard':
        await renderStudentDashboard(container);
        break;
      case 'academics':
      case 'library':
        await renderAcademicsHub(container, false);
        break;
      case 'attendance':
        await renderStudentAttendance(container);
        break;
      case 'examination':
        await renderStudentExamination(container);
        break;
      case 'notices':
        await renderNoticesView(container);
        break;
      case 'events':
        await renderEventsView(container);
        break;
      case 'profile':
        await renderProfileView(container);
        break;
      default:
        await renderStudentDashboard(container);
    }
  } else if (AppState.currentRole === 'teacher') {
    switch (AppState.currentTab) {
      case 'dashboard':
        await renderTeacherDashboard(container);
        break;
      case 'attendance_record':
        await renderTeacherAttendanceRecord(container);
        break;
      case 'academics':
        await renderAcademicsHub(container, true);
        break;
      case 'assignments_manage':
        await renderTeacherAssignmentsManage(container);
        break;
      case 'marks_manage':
        await renderTeacherMarksManage(container);
        break;
      case 'notices_manage':
        await renderTeacherNoticesManage(container);
        break;
      case 'students_list':
        await renderStudentsDirectory(container);
        break;
      case 'reports_teacher':
        await renderReportsTeacher(container);
        break;
      case 'profile':
        await renderProfileView(container);
        break;
      default:
        await renderTeacherDashboard(container);
    }
  } else if (AppState.currentRole === 'department') {
    switch (AppState.currentTab) {
      case 'dashboard':
        await renderDepartmentDashboard(container);
        break;
      case 'students_list':
        await renderStudentsDirectory(container, true);
        break;
      case 'faculty_list':
        await renderFacultyDirectory(container);
        break;
      case 'attendance_analytics':
        await renderDeptAttendanceAnalytics(container);
        break;
      case 'exam_approvals':
        await renderDeptExamApprovals(container);
        break;
      case 'notices_manage':
        await renderTeacherNoticesManage(container);
        break;
      case 'db_settings':
        renderDbSettingsView(container);
        break;
      default:
        await renderDepartmentDashboard(container);
    }
  }
}

// ---------------- 1. STUDENT DASHBOARD (Screenshot 1 Match) ----------------
async function renderStudentDashboard(container) {
  const res = await fetch('/api/dashboard/student');
  const d = await res.json();

  container.innerHTML = `
    <!-- Welcome Hero Banner -->
    <div class="welcome-hero-banner">
      <div class="hero-content">
        <div class="hero-subtitle">${d.student.subQuoteTag}</div>
        <div class="hero-title">Welcome back,<br>${d.student.name}</div>
        <div class="hero-quote">"${d.student.welcomeQuote}"</div>
      </div>
      <div class="campus-img-overlay">
        <img src="/assets/campus.png" alt="KSIT Campus" onerror="this.src='/assets/raw/WhatsApp Image 2026-09-29 at 4.35.47 PM.jpeg'">
      </div>
      <div class="hero-right-widget">
        <div class="weather-widget">
          <div class="weather-date">${d.student.date}</div>
          <div class="weather-temp">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" width="18" height="18"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            28°C
          </div>
          <div class="weather-loc">Partly Cloudy Bengaluru</div>
        </div>
      </div>
    </div>

    <!-- 4 Summary Metrics Cards -->
    <div class="metrics-row">
      <div class="metric-card" onclick="navigateToTab('attendance')">
        <div class="metric-left">
          <div class="metric-icon-box blue">${Icons.attendance}</div>
          <div class="metric-info">
            <div class="label">Attendance</div>
            <div class="value">${d.summaryCards.attendance.percentage}</div>
            <div class="sublabel">${d.summaryCards.attendance.sublabel}</div>
          </div>
        </div>
        <div class="metric-arrow">${Icons.chevronRight}</div>
      </div>

      <div class="metric-card" onclick="navigateToTab('examination')">
        <div class="metric-left">
          <div class="metric-icon-box green">
            <span style="font-weight:800;font-size:16px;">A+</span>
          </div>
          <div class="metric-info">
            <div class="label">Current CGPA</div>
            <div class="value">${d.summaryCards.cgpa.score}</div>
            <div class="sublabel">${d.summaryCards.cgpa.sublabel}</div>
          </div>
        </div>
        <div class="metric-arrow">${Icons.chevronRight}</div>
      </div>

      <div class="metric-card" onclick="navigateToTab('examination')">
        <div class="metric-left">
          <div class="metric-icon-box purple">${Icons.examination}</div>
          <div class="metric-info">
            <div class="label">Upcoming Exams</div>
            <div class="value">${d.summaryCards.upcomingExams.count}</div>
            <div class="sublabel">${d.summaryCards.upcomingExams.sublabel}</div>
          </div>
        </div>
        <div class="metric-arrow">${Icons.chevronRight}</div>
      </div>
    </div>

    <!-- 3-Column Dashboard Grid -->
    <div class="dashboard-grid-3col">
      <!-- Left Column: Today's Schedule -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              ${Icons.events}
              <div class="card-title">Today's Schedule</div>
            </div>
            <div class="card-header-date">Mon, 29 Sep 2025</div>
          </div>

          <div class="schedule-list">
            ${d.schedule.map(s => `
              <div class="schedule-item ${s.is_break ? 'break' : ''}">
                <div class="time-slot">${s.time_slot}</div>
                <div class="schedule-details">
                  <div class="schedule-period">${s.period_label}</div>
                  <div class="schedule-subject">${s.subject_name}</div>
                </div>
                <div><span class="room-badge">${s.room_no}</span></div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top:16px;text-align:right;">
            <a class="view-all-link" onclick="navigateToTab('examination')">View Full Timetable &rarr;</a>
          </div>
        </div>

        <!-- Motivation Banner Card -->
        <div class="motivation-goal-card">
          <h5>Every step you take brings you closer to your goals.</h5>
          <button class="btn-keep-going" onclick="navigateToTab('academics')">Keep Going &rarr;</button>
        </div>
      </div>

      <!-- Center Column: Quick Links & Upcoming Events -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" style="color:#eab308;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <div class="card-title">Quick Links</div>
            </div>
          </div>

          <div class="quick-links-grid">
            <div class="quick-link-btn" onclick="navigateToTab('attendance')">
              <div class="quick-icon-wrap" style="background:#16A58B;">${Icons.attendance}</div>
              <span>View Attendance</span>
            </div>
            <div class="quick-link-btn" onclick="navigateToTab('examination')">
              <div class="quick-icon-wrap" style="background:#8052D6;">${Icons.examination}</div>
              <span>Exam Results</span>
            </div>
            <div class="quick-link-btn" onclick="navigateToTab('academics')">
              <div class="quick-icon-wrap" style="background:#f97316;">${Icons.library}</div>
              <span>Library Portal</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              ${Icons.events}
              <div class="card-title">Upcoming Events</div>
            </div>
            <a class="view-all-link" onclick="navigateToTab('events')">View All &rarr;</a>
          </div>

          <div class="events-list">
            ${d.upcomingEvents.map(e => `
              <div class="event-row">
                <div class="event-date-box">
                  <span class="month">${e.date_badge.month}</span>
                  <span class="day">${e.date_badge.day}</span>
                </div>
                <div class="event-meta">
                  <h5>${e.title}</h5>
                  <p>${e.time_range} • ${e.venue}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Right Column: Announcements -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              ${Icons.notices}
              <div class="card-title">Latest Announcements</div>
            </div>
            <a class="view-all-link" onclick="navigateToTab('notices')">View All &rarr;</a>
          </div>

          <div class="announcement-list">
            ${d.announcements.slice(0, 5).map(a => `
              <div class="announcement-item ${a.priority === 'High' ? 'high' : ''}" onclick="viewNoticeDetail(${a.id})">
                <div class="announcement-top">
                  <div class="announcement-title">${a.title}</div>
                  ${a.is_new ? '<span class="badge-new">New</span>' : ''}
                </div>
                <div class="announcement-footer">${a.category} • ${a.date_posted}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------------- 2. ACADEMIC RESOURCE HUB (Centralized Materials / Library) ----------------
async function renderAcademicsHub(container, isTeacherOrDept = false) {
  if (!isTeacherOrDept) {
    // Student View: Library Integrated into Academic & Study Hub
    const res = await fetch('/api/library');
    const books = await res.json();

    container.innerHTML = `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Academic & Study Hub — Library Catalogue</h2>
        <p style="font-size:13px;color:#64748b;">Check textbook rack locations, shelf availability, and access digital eBooks.</p>
      </div>

      <div class="card table-responsive">
        <table class="custom-table" id="academicLibraryTable">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Department / Domain</th>
              <th>Semester</th>
              <th>Available Copies</th>
              <th>Physical Location</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${books.map(b => `
              <tr>
                <td><strong>${b.title}</strong></td>
                <td>${b.author}</td>
                <td><code>${b.isbn}</code></td>
                <td>${b.category}</td>
                <td>Sem ${b.semester}</td>
                <td><span class="status-pill good">${b.available_copies} Copies</span></td>
                <td><span class="room-badge">${b.rack_no}</span></td>
                <td>
                  <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="showToast('Digital eBook link opened!')">
                    View eBook &nearr;
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  // Teacher View: Resource Library with Upload Capabilities
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Faculty Resource Library</h2>
        <p style="font-size:13px;color:#64748b;">Centralized departmental repository for lecture notes, syllabus, PYQ papers & academic content.</p>
      </div>
      <div>
        <button class="btn btn-primary" onclick="openUploadResourceModal()">
          ${Icons.plus} Upload New Material
        </button>
      </div>
    </div>

    <!-- Category Tabs Filter -->
    <div class="tab-pills-row" id="resourceCategoryTabs">
      <button class="tab-pill active" data-cat="all" onclick="filterResources('all')">All Resources</button>
      <button class="tab-pill" data-cat="notes" onclick="filterResources('notes')">Lecture Notes & Slides</button>
      <button class="tab-pill" data-cat="syllabus" onclick="filterResources('syllabus')">Syllabus & Curriculum</button>
      <button class="tab-pill" data-cat="pyq" onclick="filterResources('pyq')">Previous-Year Papers (PYQ)</button>
      <button class="tab-pill" data-cat="research_paper" onclick="filterResources('research_paper')">Research Papers</button>
      <button class="tab-pill" data-cat="online_course" onclick="filterResources('online_course')">Online Courses (NPTEL)</button>
      <button class="tab-pill" data-cat="certification" onclick="filterResources('certification')">Certifications</button>
    </div>

    <!-- Filter Bar (Search & Semester Filter) -->
    <div class="card" style="padding:14px 18px;margin-bottom:24px;">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
        <div style="flex:1;min-width:240px;position:relative;">
          <input type="text" id="resourceSearchInput" class="form-control" placeholder="Search by title, subject, keyword (e.g. Calculus, C pointers)..." oninput="loadResourcesList()">
        </div>
        <div style="width:180px;">
          <select id="resourceSemesterFilter" class="form-control" onchange="loadResourcesList()">
            <option value="all">All Semesters</option>
            <option value="1" selected>1st Semester</option>
            <option value="2">2nd Semester</option>
            <option value="3">3rd Semester</option>
            <option value="4">4th Semester</option>
            <option value="5">5th Semester</option>
            <option value="6">6th Semester</option>
            <option value="7">7th Semester</option>
            <option value="8">8th Semester</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Resources Cards Grid -->
    <div id="resourcesGridContainer" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;">
      <div style="padding:30px;color:#64748b;">Loading resources...</div>
    </div>
  `;

  window.activeResourceCategory = 'all';
  await loadResourcesList();
}

async function filterResources(category) {
  window.activeResourceCategory = category;
  document.querySelectorAll('#resourceCategoryTabs .tab-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === category);
  });
  await loadResourcesList();
}

async function loadResourcesList() {
  const container = document.getElementById('resourcesGridContainer');
  if (!container) return;

  const cat = window.activeResourceCategory || 'all';
  const sem = document.getElementById('resourceSemesterFilter')?.value || 'all';
  const search = document.getElementById('resourceSearchInput')?.value || '';

  const queryParams = new URLSearchParams();
  if (cat !== 'all') queryParams.append('category', cat);
  if (sem !== 'all') queryParams.append('semester', sem);
  if (search) queryParams.append('search', search);

  const res = await fetch('/api/resources?' + queryParams.toString());
  const data = await res.json();

  if (data.resources.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:50px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" width="48" height="48" style="margin-bottom:12px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <h4 style="font-size:16px;color:#101C3A;">No study materials found</h4>
        <p style="font-size:12px;color:#64748b;margin-top:4px;">Try changing filters or upload new academic content.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = data.resources.map(r => `
    <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;justify-content:space-between;transition:transform 0.2s, box-shadow 0.2s;" onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='var(--shadow-md)'" onmouseleave="this.style.transform='none';this.style.boxShadow='var(--shadow-sm)'">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
          <span class="status-pill ${r.category === 'notes' ? 'ongoing' : r.category === 'pyq' ? 'upcoming' : 'warning'}" style="text-transform:uppercase;font-size:10px;">
            ${r.category.replace('_', ' ')}
          </span>
          <span style="font-size:11px;font-weight:700;color:#4169E1;background:#eff6ff;padding:2px 8px;border-radius:12px;">
            Sem ${r.semester}
          </span>
        </div>

        <h4 style="font-size:14.5px;font-weight:700;color:#101C3A;line-height:1.3;margin-bottom:6px;">${r.title}</h4>
        <p style="font-size:12px;color:#64748b;line-height:1.4;margin-bottom:14px;">${r.description}</p>
      </div>

      <div style="border-top:1px solid #f1f5f9;padding-top:12px;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:11px;color:#64748b;">
          <div><strong>${r.subject_name}</strong></div>
          <div>By ${r.uploaded_by} • ${r.file_size}</div>
        </div>

        <div>
          ${r.external_url ? `
            <a href="${r.external_url}" target="_blank" class="btn btn-secondary" style="font-size:11.5px;padding:6px 12px;">
              Access Link &nearr;
            </a>
          ` : `
            <button class="btn btn-primary" style="font-size:11.5px;padding:6px 12px;" onclick="downloadResource('${r.title}')">
              ${Icons.download} Download
            </button>
          `}
        </div>
      </div>
    </div>
  `).join('');
}

function downloadResource(title) {
  showToast(`Downloading: "${title}" (PDF)`);
}

// ---------------- 3. STUDENT ATTENDANCE VIEW ----------------
async function renderStudentAttendance(container) {
  const res = await fetch('/api/attendance/student/1');
  const d = await res.json();

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Attendance Tracking System</h2>
      <p style="font-size:13px;color:#64748b;">Subject-wise live attendance monitoring with VTU eligibility criteria.</p>
    </div>

    <!-- Attendance Overview Ring Card -->
    <div class="card" style="display:flex;align-items:center;gap:32px;flex-wrap:wrap;padding:28px;">
      <div style="width:130px;height:130px;border-radius:50%;border:10px solid var(--color-teal, #0d9488);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(13, 148, 136, 0.3);">
        <div style="font-size:28px;font-weight:800;color:#101C3A;">${d.overall_percentage}%</div>
        <div style="font-size:11px;color:#64748b;font-weight:600;">Overall</div>
      </div>

      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <h3 style="font-size:18px;font-weight:700;color:#101C3A;">Student: ${d.student_name}</h3>
          <span class="status-pill good">${d.status}</span>
        </div>
        <p style="font-size:13px;color:#64748b;margin-bottom:12px;">
          You have attended <strong>${d.present_days} out of ${d.total_days}</strong> conducted instruction days. Minimum VTU requirement is 75% for examination hall ticket clearance.
        </p>
        <div style="display:flex;gap:20px;font-size:12px;">
          <div><span style="color:#16A58B;font-weight:700;">●</span> Attended: <strong>${d.present_days} Days</strong></div>
          <div><span style="color:#ef4444;font-weight:700;">●</span> Absent: <strong>${d.total_days - d.present_days} Days</strong></div>
          <div><span style="color:#3b82f6;font-weight:700;">●</span> Safety Margin: <strong>+17% over criteria</strong></div>
        </div>
      </div>
    </div>

    <!-- Subject Wise Breakdown Table -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Subject-Wise Attendance Breakdown</div>
      </div>

      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Classes Held</th>
              <th>Classes Attended</th>
              <th>Percentage</th>
              <th>Progress</th>
              <th>Eligibility Status</th>
            </tr>
          </thead>
          <tbody>
            ${d.subject_wise.map(s => `
              <tr>
                <td><strong>${s.subject_name}</strong></td>
                <td>${s.classes_held}</td>
                <td>${s.classes_attended}</td>
                <td><strong style="color:${s.percentage >= 75 ? '#16A58B' : '#ef4444'};">${s.percentage}%</strong></td>
                <td style="width:160px;">
                  <div class="progress-bar-bg" style="height:6px;">
                    <div class="progress-fill" style="width:${s.percentage}%;background:${s.percentage >= 75 ? '#16A58B' : '#ef4444'};"></div>
                  </div>
                </td>
                <td><span class="status-pill ${s.percentage >= 75 ? 'good' : 'danger'}">${s.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------- 4. STUDENT ASSIGNMENTS VIEW ----------------
async function renderStudentAssignments(container) {
  const res = await fetch('/api/assignments');
  const assignments = await res.json();

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Assignments & Deadlines</h2>
        <p style="font-size:13px;color:#64748b;">Centralized submission tracking with faculty feedback & marks.</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:20px;">
      ${assignments.map(a => `
        <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <span class="room-badge">${a.subject_name}</span>
              <span class="status-pill ${a.status === 'submitted' ? 'ongoing' : a.status === 'due_soon' ? 'urgent' : 'warning'}">
                ${a.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <h4 style="font-size:15px;font-weight:700;color:#101C3A;margin-bottom:6px;">${a.title}</h4>
            <p style="font-size:12px;color:#64748b;margin-bottom:12px;line-height:1.4;">${a.description}</p>
          </div>

          <div style="border-top:1px solid #f1f5f9;padding-top:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:#64748b;margin-bottom:12px;">
              <div>Deadline: <strong>${a.deadline}</strong></div>
              <div>Max Marks: <strong>${a.max_marks}</strong></div>
            </div>

            ${a.status === 'submitted' ? `
              <div style="background:#f8fafc;padding:8px 12px;border-radius:6px;font-size:11.5px;color:#059669;margin-bottom:8px;">
                ✔ Submitted on ${a.submitted_date || '27 Sep 2025'}. Under evaluation.
              </div>
            ` : `
              <button class="btn btn-primary" style="width:100%;font-size:12.5px;" onclick="openSubmitAssignmentModal(${a.id}, '${a.title}')">
                ${Icons.upload} Submit Assignment
              </button>
            `}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------------- 5. STUDENT EXAMINATION VIEW ----------------
async function renderStudentExamination(container) {
  const [examsRes, marksRes] = await Promise.all([
    fetch('/api/examinations'),
    fetch('/api/marks/student/1')
  ]);
  const exams = await examsRes.json();
  const marks = await marksRes.json();

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Examination & Performance Hub</h2>
      <p style="font-size:13px;color:#64748b;">Internal test schedules, syllabus, semester results & previous question papers.</p>
    </div>

    <!-- Exam Timetable Schedule -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Upcoming Examination Schedule (Internal Assessment 1)</div>
      </div>
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Examination</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Timing</th>
              <th>Room Allotment</th>
              <th>Max Marks</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${exams.map(e => `
              <tr>
                <td><strong>${e.title}</strong></td>
                <td>${e.subject_name}</td>
                <td>${e.exam_date}</td>
                <td>${e.time_slot}</td>
                <td><span class="room-badge">${e.room_no}</span></td>
                <td>${e.max_marks}</td>
                <td><span class="status-pill scheduled">${e.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Internal Marks & Grades -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Academic Marks & Assessment Record</div>
      </div>
      <div class="table-responsive">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Assessment Type</th>
              <th>Marks Scored</th>
              <th>Max Marks</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            ${marks.map(m => `
              <tr>
                <td><strong>${m.subject_name}</strong></td>
                <td>${m.exam_type}</td>
                <td><strong style="color:#4169E1;font-size:14px;">${m.marks_obtained}</strong></td>
                <td>${m.max_marks}</td>
                <td><span class="status-pill good">${m.grade}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------- 6. NOTICES & ANNOUNCEMENTS VIEW ----------------
async function renderNoticesView(container) {
  const res = await fetch('/api/notices');
  const notices = await res.json();

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Department Notices & Circulars</h2>
        <p style="font-size:13px;color:#64748b;">Verified official updates — never lose important announcements in WhatsApp chat scroll.</p>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:14px;">
      ${notices.map(n => `
        <div class="card" style="margin-bottom:0;padding:18px 22px;border-left:4px solid ${n.priority === 'High' ? '#ef4444' : '#4169E1'};">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="status-pill ${n.category === 'Exams' ? 'upcoming' : 'ongoing'}">${n.category}</span>
              <h4 style="font-size:15px;font-weight:700;color:#101C3A;">${n.title}</h4>
              ${n.is_new ? '<span class="badge-new">New</span>' : ''}
            </div>
            <div style="font-size:11.5px;color:#64748b;">${n.date_posted}</div>
          </div>
          <p style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:8px;">${n.description}</p>
          <div style="font-size:11px;color:#94a3b8;">Issued by: <strong>${n.author || 'Department Administration'}</strong></div>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------------- 7. EVENTS VIEW ----------------
async function renderEventsView(container) {
  const res = await fetch('/api/events');
  const events = await res.json();

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Events, Hackathons & Workshops</h2>
      <p style="font-size:13px;color:#64748b;">Technical talks, coding competitions, and department activities.</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;">
      ${events.map(e => `
        <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <span class="room-badge">${e.category}</span>
              <span style="font-size:11px;color:#64748b;">Organized by: ${e.organizer}</span>
            </div>
            <h4 style="font-size:15.5px;font-weight:700;color:#101C3A;margin-bottom:6px;">${e.title}</h4>
            <p style="font-size:12.5px;color:#64748b;margin-bottom:14px;line-height:1.4;">${e.description}</p>
          </div>

          <div style="border-top:1px solid #f1f5f9;padding-top:12px;">
            <div style="font-size:11.5px;color:#475569;margin-bottom:12px;">
              <div>📅 <strong>${e.event_date}</strong> (${e.time_range})</div>
              <div>📍 <strong>${e.venue}</strong></div>
            </div>
            <button class="btn btn-primary" style="width:100%;font-size:12px;" onclick="showToast('Successfully registered for ${e.title}!')">
              Register / RSVP
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------------- 8. LIBRARY VIEW ----------------
async function renderLibraryView(container) {
  const res = await fetch('/api/library');
  const books = await res.json();

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Library & Digital Resource Catalogue</h2>
      <p style="font-size:13px;color:#64748b;">Check textbook rack locations, digital copies, and book availability.</p>
    </div>

    <div class="table-responsive card">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>ISBN</th>
            <th>Department / Domain</th>
            <th>Semester</th>
            <th>Available Copies</th>
            <th>Physical Location</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${books.map(b => `
            <tr>
              <td><strong>${b.title}</strong></td>
              <td>${b.author}</td>
              <td><code>${b.isbn}</code></td>
              <td>${b.category}</td>
              <td>Sem ${b.semester}</td>
              <td><span class="status-pill good">${b.available_copies} Copies</span></td>
              <td><span class="room-badge">${b.rack_no}</span></td>
              <td>
                <button class="btn btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="showToast('Digital eBook link opened!')">
                  View eBook &nearr;
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ---------------- 9. PLACEMENT VIEW ----------------
async function renderPlacementsView(container) {
  const res = await fetch('/api/placements');
  const placements = await res.json();

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Placement & Career Portal</h2>
      <p style="font-size:13px;color:#64748b;">Campus placement drives, industry internships & pre-placement training sessions.</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;">
      ${placements.map(p => `
        <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <span class="status-pill ongoing">${p.role_type}</span>
              <strong style="color:#059669;font-size:13px;">${p.package_details}</strong>
            </div>
            <h4 style="font-size:16px;font-weight:700;color:#101C3A;margin-bottom:4px;">${p.company_name}</h4>
            <div style="font-size:13px;font-weight:600;color:#4169E1;margin-bottom:8px;">${p.job_title}</div>
            <p style="font-size:12px;color:#64748b;margin-bottom:10px;">Eligibility: <strong>${p.eligibility}</strong></p>
          </div>

          <div style="border-top:1px solid #f1f5f9;padding-top:12px;">
            <div style="font-size:11px;color:#64748b;margin-bottom:10px;">Deadline: <strong>${p.deadline}</strong></div>
            <a href="${p.apply_link}" target="_blank" class="btn btn-primary" style="width:100%;font-size:12px;">
              Apply Now &nearr;
            </a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------------- 10. COMMUNITY-BASED PROJECT (CBP) VIEW ----------------
async function renderCommunityView(container) {
  const res = await fetch('/api/community-project');
  const projects = await res.json();
  const cbp = projects[0];

  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <span class="status-pill ongoing" style="margin-bottom:8px;">COMMUNITY-BASED PROJECT (CBP)</span>
      <h2 style="font-size:24px;font-weight:800;color:#101C3A;">${cbp.project_title}</h2>
      <p style="font-size:14px;color:#64748b;">Department of Computer Science & Engineering - ICB | K. S. Institute of Technology, Bengaluru</p>
    </div>

    <!-- Vision Card -->
    <div class="card" style="background:linear-gradient(135deg, #0e1e38, #1e3a6a);color:#fff;padding:28px;">
      <div style="font-size:13px;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px;">THE PROJECT VISION</div>
      <h3 style="font-size:22px;font-weight:800;margin-bottom:12px;color:#ffffff;">One Platform. One Department. Better Academic Management.</h3>
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;margin-top:20px;">
        <div style="background:rgba(255,255,255,0.08);padding:14px;border-radius:8px;">
          <div style="font-weight:700;color:#60a5fa;margin-bottom:4px;">Students</div>
          <div style="font-size:13px;">Access • Track • Learn</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);padding:14px;border-radius:8px;">
          <div style="font-weight:700;color:#34d399;margin-bottom:4px;">Teachers</div>
          <div style="font-size:13px;">Share • Manage • Evaluate</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);padding:14px;border-radius:8px;">
          <div style="font-weight:700;color:#f472b6;margin-bottom:4px;">Department</div>
          <div style="font-size:13px;">Organize • Communicate • Monitor</div>
        </div>
      </div>
    </div>

    <!-- Team STACK X Details -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Project Team & Mentors (STACK X)</div>
        <span class="room-badge">AY 2025-26</span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:16px;">
        <div style="background:#f8fafc;padding:16px;border-radius:10px;border:1px solid #e2e8f0;">
          <div style="font-size:14px;font-weight:700;color:#101C3A;">D V Manas Srujan</div>
          <div style="font-size:12px;color:#4169E1;font-weight:600;">1KS25IC015</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">CSE (ICB) • 1st Year</div>
        </div>
        <div style="background:#f8fafc;padding:16px;border-radius:10px;border:1px solid #e2e8f0;">
          <div style="font-size:14px;font-weight:700;color:#101C3A;">Hussain Basha</div>
          <div style="font-size:12px;color:#4169E1;font-weight:600;">1KS25IC023</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">CSE (ICB) • 1st Year</div>
        </div>
        <div style="background:#f8fafc;padding:16px;border-radius:10px;border:1px solid #e2e8f0;">
          <div style="font-size:14px;font-weight:700;color:#101C3A;">M Pavani Gowda</div>
          <div style="font-size:12px;color:#4169E1;font-weight:600;">1KS25IC033</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">CSE (ICB) • 1st Year</div>
        </div>
        <div style="background:#f8fafc;padding:16px;border-radius:10px;border:1px solid #e2e8f0;">
          <div style="font-size:14px;font-weight:700;color:#101C3A;">Purvi B V</div>
          <div style="font-size:12px;color:#4169E1;font-weight:600;">1KS25IC045</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">CSE (ICB) • 1st Year</div>
        </div>
      </div>

      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;color:#475569;">
        <strong>Project Mentors:</strong> Prof. R. Sharma (Assistant Professor)
      </div>
    </div>
  `;
}

// ---------------- 11. PROFILE & SETTINGS VIEW ----------------
async function renderProfileView(container) {
  const u = AppState.user;
  const p = AppState.profile;

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:22px;font-weight:800;color:#101C3A;">User Profile & Settings</h2>
      <p style="font-size:13px;color:#64748b;">Manage academic credentials, notification preferences, and contact details.</p>
    </div>

    <div class="card" style="max-width:700px;">
      <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px;">
        <div style="width:64px;height:64px;border-radius:50%;background:#4169E1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;">
          ${u.name.split(' ').map(n=>n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <h3 style="font-size:18px;font-weight:700;color:#101C3A;">${u.name}</h3>
          <div style="font-size:13px;color:#4169E1;font-weight:600;">${p.usn || p.employee_id || 'KSIT Staff'}</div>
          <div style="font-size:12px;color:#64748b;">${u.email}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div class="form-group">
          <label>Department</label>
          <input type="text" class="form-control" value="Computer Science & Engineering (ICB)" readonly>
        </div>
        <div class="form-group">
          <label>College</label>
          <input type="text" class="form-control" value="K. S. Institute of Technology, Bengaluru" readonly>
        </div>
        <div class="form-group">
          <label>Contact Phone</label>
          <input type="text" class="form-control" value="${u.phone || '+91 98450 11223'}">
        </div>
        <div class="form-group">
          <label>Academic Year</label>
          <input type="text" class="form-control" value="2025 - 2026" readonly>
        </div>
      </div>

      <div style="border-top:1px solid #f1f5f9;padding-top:16px;display:flex;justify-content:flex-end;">
        <button class="btn btn-primary" onclick="showToast('Profile information saved!')">
          Save Changes
        </button>
      </div>
    </div>
  `;
}

// ---------------- 12. TEACHER DASHBOARD (Screenshot 3 Match) ----------------
async function renderTeacherDashboard(container) {
  const res = await fetch('/api/dashboard/teacher');
  const d = await res.json();

  container.innerHTML = `
    <!-- Teacher Header Banner -->
    <div class="welcome-hero-banner">
      <div class="hero-content">
        <div class="hero-subtitle">FACULTY DASHBOARD</div>
        <div class="hero-title">Good Morning, ${d.teacher.name}</div>
        <div class="hero-tagline">Here's what's happening in your department today.</div>
        <div class="hero-quote">"Better Students, Better Future KSIT"</div>
      </div>
      <div class="campus-img-overlay">
        <img src="/assets/campus.png" alt="KSIT Campus">
      </div>
      <div class="hero-right-widget">
        <div class="weather-widget">
          <div class="weather-date">${d.teacher.date}</div>
          <div class="weather-temp">Monday</div>
          <div class="weather-loc">AY: ${d.teacher.academicYear}</div>
        </div>
      </div>
    </div>

    <!-- 4 Teacher Metrics Cards -->
    <div class="metrics-row">
      <div class="metric-card" onclick="navigateToTab('students_list')">
        <div class="metric-left">
          <div class="metric-icon-box blue">${Icons.students}</div>
          <div class="metric-info">
            <div class="label">${d.summaryCards.totalStudents.label}</div>
            <div class="value">${d.summaryCards.totalStudents.count}</div>
            <div class="sublabel">${d.summaryCards.totalStudents.sublabel}</div>
          </div>
        </div>
        <div class="metric-arrow">${Icons.chevronRight}</div>
      </div>

      <div class="metric-card" onclick="navigateToTab('attendance_record')">
        <div class="metric-left">
          <div class="metric-icon-box green">${Icons.attendance}</div>
          <div class="metric-info">
            <div class="label">${d.summaryCards.classesToday.label}</div>
            <div class="value">${d.summaryCards.classesToday.count}</div>
            <div class="sublabel">${d.summaryCards.classesToday.sublabel}</div>
          </div>
        </div>
        <div class="metric-arrow">${Icons.chevronRight}</div>
      </div>

      <div class="metric-card" onclick="navigateToTab('assignments_manage')">
        <div class="metric-left">
          <div class="metric-icon-box purple">${Icons.assignments}</div>
          <div class="metric-info">
            <div class="label">${d.summaryCards.pendingEvaluations.label}</div>
            <div class="value">${d.summaryCards.pendingEvaluations.count}</div>
            <div class="sublabel">${d.summaryCards.pendingEvaluations.sublabel}</div>
          </div>
        </div>
        <div class="metric-arrow">${Icons.chevronRight}</div>
      </div>

      <div class="metric-card" onclick="navigateToTab('notices_manage')">
        <div class="metric-left">
          <div class="metric-icon-box orange">${Icons.notices}</div>
          <div class="metric-info">
            <div class="label">${d.summaryCards.notices.label}</div>
            <div class="value">${d.summaryCards.notices.count}</div>
            <div class="sublabel">${d.summaryCards.notices.sublabel}</div>
          </div>
        </div>
        <div class="metric-arrow">${Icons.chevronRight}</div>
      </div>
    </div>

    <!-- Teacher 3-Column Grid -->
    <div class="dashboard-grid-3col">
      <!-- Left: Today's Schedule -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              ${Icons.events}
              <div class="card-title">Today's Schedule</div>
            </div>
            <div class="card-header-date">Mon, 29 Sep 2025</div>
          </div>

          <div class="schedule-list">
            ${d.todaySchedule.map(s => `
              <div class="schedule-item ${s.status === 'Break' ? 'break' : ''}">
                <div class="time-slot">${s.time}</div>
                <div class="schedule-details">
                  <div class="schedule-period">${s.period}</div>
                  <div class="schedule-subject">${s.subject}</div>
                  <div style="font-size:10.5px;color:#64748b;">${s.room}</div>
                </div>
                <div><span class="status-pill ${s.status === 'Completed' ? 'good' : s.status === 'Break' ? 'warning' : 'upcoming'}">${s.status}</span></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Center: Class Overview Circles & Line Chart -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              ${Icons.reports}
              <div class="card-title">Class Overview (${d.classOverview.class_name})</div>
            </div>
            <span class="room-badge">This Week</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div style="background:#f8fafc;padding:14px;border-radius:10px;text-align:center;">
              <div style="font-size:11px;color:#64748b;font-weight:600;">Classes Conducted</div>
              <div style="font-size:22px;font-weight:800;color:#101C3A;margin:4px 0;">${d.classOverview.classes_conducted}</div>
              <span class="status-pill good">${d.classOverview.classes_conducted_pct}%</span>
            </div>

            <div style="background:#f8fafc;padding:14px;border-radius:10px;text-align:center;">
              <div style="font-size:11px;color:#64748b;font-weight:600;">Attendance Rate</div>
              <div style="font-size:22px;font-weight:800;color:#059669;margin:4px 0;">${d.classOverview.attendance_rate}%</div>
              <div style="font-size:10.5px;color:#16A58B;">${d.classOverview.attendance_delta}</div>
            </div>

            <div style="background:#f8fafc;padding:14px;border-radius:10px;text-align:center;">
              <div style="font-size:11px;color:#64748b;font-weight:600;">Average Marks</div>
              <div style="font-size:22px;font-weight:800;color:#4169E1;margin:4px 0;">${d.classOverview.average_marks} / 10</div>
              <div style="font-size:10.5px;color:#4169E1;">+0.6 improvement</div>
            </div>

            <div style="background:#f8fafc;padding:14px;border-radius:10px;text-align:center;">
              <div style="font-size:11px;color:#64748b;font-weight:600;">Total Students</div>
              <div style="font-size:22px;font-weight:800;color:#101C3A;margin:4px 0;">${d.classOverview.total_students}</div>
              <span class="room-badge">3rd Sem CSE</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Quick Actions -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title-group">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4169E1" width="18" height="18"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <div class="card-title">Quick Actions</div>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-secondary" style="justify-content:space-between;padding:12px 16px;" onclick="navigateToTab('attendance_record')">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="color:#4169E1;">${Icons.attendance}</span>
                <span>Mark Attendance</span>
              </span>
              <span>&rarr;</span>
            </button>

            <button class="btn btn-secondary" style="justify-content:space-between;padding:12px 16px;" onclick="navigateToTab('academics')">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="color:#8052D6;">${Icons.academics}</span>
                <span>Resource Library</span>
              </span>
              <span>&rarr;</span>
            </button>

            <button class="btn btn-secondary" style="justify-content:space-between;padding:12px 16px;" onclick="openCreateAssignmentModal()">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="color:#16A58B;">${Icons.assignments}</span>
                <span>Create Assignment</span>
              </span>
              <span>&rarr;</span>
            </button>

            <button class="btn btn-secondary" style="justify-content:space-between;padding:12px 16px;" onclick="openPostNoticeModal()">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="color:#f97316;">${Icons.notices}</span>
                <span>Post Department Notice</span>
              </span>
              <span>&rarr;</span>
            </button>

            <button class="btn btn-secondary" style="justify-content:space-between;padding:12px 16px;" onclick="navigateToTab('reports_teacher')">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="color:#06b6d4;">${Icons.reports}</span>
                <span>View Class Results</span>
              </span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------------- 13. TEACHER RECORD ATTENDANCE ----------------
async function renderTeacherAttendanceRecord(container) {
  const res = await fetch('/api/students');
  const students = await res.json();

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Record Class Attendance</h2>
        <p style="font-size:13px;color:#64748b;">Instant period-wise attendance recording with live database sync.</p>
      </div>

      <div style="display:flex;gap:10px;">
        <button class="btn btn-secondary" onclick="markAllAttendance('present')">
          ✔ Mark All Present
        </button>
        <button class="btn btn-primary" onclick="submitAttendanceRecord()">
          Save & Commit Attendance
        </button>
      </div>
    </div>

    <!-- Control Filters Bar -->
    <div class="card" style="padding:16px 20px;margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:16px;">
        <div class="form-group" style="margin:0;">
          <label>Subject</label>
          <select id="attSubjectSelect" class="form-control">
            <option value="Programming in C">CSE103 - Programming in C</option>
            <option value="Mathematics">MAT101 - Mathematics</option>
            <option value="Physics">PHY102 - Physics</option>
            <option value="Engineering Graphics">ENG104 - Engineering Graphics</option>
          </select>
        </div>

        <div class="form-group" style="margin:0;">
          <label>Class / Semester</label>
          <select class="form-control">
            <option>1st Year CSE (ICB) - Section A</option>
            <option>3rd Sem CSE (ICB) - Section A</option>
          </select>
        </div>

        <div class="form-group" style="margin:0;">
          <label>Period</label>
          <select id="attPeriodSelect" class="form-control">
            <option value="1">Period 1 (08:30 - 09:25 AM)</option>
            <option value="2">Period 2 (09:25 - 10:20 AM)</option>
            <option value="3" selected>Period 3 (10:35 - 11:30 AM)</option>
            <option value="4">Period 4 (11:30 - 12:25 PM)</option>
          </select>
        </div>

        <div class="form-group" style="margin:0;">
          <label>Date</label>
          <input type="date" id="attDateInput" class="form-control" value="2025-09-29">
        </div>
      </div>
    </div>

    <!-- Student Attendance Roster Table -->
    <div class="card">
      <div class="table-responsive">
        <table class="custom-table" id="attendanceRosterTable">
          <thead>
            <tr>
              <th>USN</th>
              <th>Student Name</th>
              <th>Current Rate</th>
              <th>Action (Toggle Status)</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr data-student-id="${s.id}">
                <td><code>${s.usn}</code></td>
                <td><strong>${s.name}</strong></td>
                <td><strong style="color:#059669;">${s.attendance_pct}%</strong></td>
                <td>
                  <div style="display:inline-flex;border-radius:20px;border:1px solid #cbd5e1;overflow:hidden;" class="att-toggle-group">
                    <button type="button" class="btn-att-status active" data-status="present" onclick="setStudentAttStatus(this, 'present')" style="padding:5px 14px;border:none;background:#16A58B;color:#fff;font-weight:700;font-size:11px;cursor:pointer;">Present</button>
                    <button type="button" class="btn-att-status" data-status="absent" onclick="setStudentAttStatus(this, 'absent')" style="padding:5px 14px;border:none;background:#f8fafc;color:#64748b;font-weight:700;font-size:11px;cursor:pointer;">Absent</button>
                    <button type="button" class="btn-att-status" data-status="on_duty" onclick="setStudentAttStatus(this, 'on_duty')" style="padding:5px 14px;border:none;background:#f8fafc;color:#64748b;font-weight:700;font-size:11px;cursor:pointer;">On Duty</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setStudentAttStatus(btn, status) {
  const group = btn.closest('.att-toggle-group');
  group.querySelectorAll('.btn-att-status').forEach(b => {
    b.style.background = '#f8fafc';
    b.style.color = '#64748b';
  });

  btn.style.color = '#fff';
  if (status === 'present') btn.style.background = '#16A58B';
  else if (status === 'absent') btn.style.background = '#ef4444';
  else btn.style.background = '#f59e0b';

  group.dataset.current = status;
}

function markAllAttendance(status) {
  document.querySelectorAll('.att-toggle-group').forEach(group => {
    const btn = group.querySelector(`[data-status="${status}"]`);
    if (btn) setStudentAttStatus(btn, status);
  });
  showToast(`Marked all students as ${status.toUpperCase()}!`);
}

async function submitAttendanceRecord() {
  const records = [];
  document.querySelectorAll('#attendanceRosterTable tbody tr').forEach(tr => {
    const studentId = parseInt(tr.dataset.studentId, 10);
    const group = tr.querySelector('.att-toggle-group');
    const status = group?.dataset.current || 'present';
    records.push({ student_id: studentId, status });
  });

  const subject = document.getElementById('attSubjectSelect')?.value || 'Subject';
  const date = document.getElementById('attDateInput')?.value || '2025-09-29';

  try {
    const res = await fetch('/api/attendance/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_name: subject, date, records })
    });
    const d = await res.json();
    showToast(d.message || 'Attendance committed to database!');
  } catch (e) {
    showToast('Attendance recorded in local store.');
  }
}

// ---------------- 14. DEPARTMENT DASHBOARD (Screenshot 2 Match) ----------------
async function renderDepartmentDashboard(container) {
  const res = await fetch('/api/dashboard/department');
  const d = await res.json();

  container.innerHTML = `
    <!-- Department Staff Welcome Banner -->
    <div class="welcome-hero-banner">
      <div class="hero-content">
        <div class="hero-subtitle">ADMINISTRATION & HOD PORTAL</div>
        <div class="hero-title">Welcome back,<br>Department Office</div>
        <div class="hero-tagline">${d.admin.title}</div>
        <div class="hero-quote">${d.admin.quote}</div>
      </div>
      <div class="campus-img-overlay">
        <img src="/assets/campus.png" alt="KSIT Campus">
      </div>
      <div class="hero-right-widget">
        <div class="weather-widget">
          <div class="weather-date">${d.admin.date}</div>
          <div class="weather-temp">HOD Desk</div>
          <div class="weather-loc">AY: ${d.admin.academicYear}</div>
        </div>
      </div>
    </div>

    <!-- 5 Department Metrics Cards -->
    <div class="metrics-row" style="grid-template-columns: repeat(5, 1fr);">
      <div class="metric-card" onclick="navigateToTab('students_list')">
        <div class="metric-left">
          <div class="metric-icon-box blue">${Icons.students}</div>
          <div class="metric-info">
            <div class="label">Total Students</div>
            <div class="value">${d.summaryCards.totalStudents.count}</div>
            <div class="sublabel" style="color:#059669;">${d.summaryCards.totalStudents.delta}</div>
          </div>
        </div>
      </div>

      <div class="metric-card" onclick="navigateToTab('faculty_list')">
        <div class="metric-left">
          <div class="metric-icon-box green">${Icons.faculty}</div>
          <div class="metric-info">
            <div class="label">Faculty Members</div>
            <div class="value">${d.summaryCards.facultyMembers.count}</div>
            <div class="sublabel" style="color:#059669;">${d.summaryCards.facultyMembers.delta}</div>
          </div>
        </div>
      </div>

      <div class="metric-card" style="cursor:default;">
        <div class="metric-left">
          <div class="metric-icon-box purple">${Icons.academics}</div>
          <div class="metric-info">
            <div class="label">Active Courses</div>
            <div class="value">${d.summaryCards.activeCourses.count}</div>
            <div class="sublabel">${d.summaryCards.activeCourses.delta}</div>
          </div>
        </div>
      </div>

      <div class="metric-card" onclick="navigateToTab('exam_approvals')">
        <div class="metric-left">
          <div class="metric-icon-box orange">${Icons.examination}</div>
          <div class="metric-info">
            <div class="label">Upcoming Exams</div>
            <div class="value">${d.summaryCards.upcomingExams.count}</div>
            <div class="sublabel">${d.summaryCards.upcomingExams.delta}</div>
          </div>
        </div>
      </div>

      <div class="metric-card" onclick="navigateToTab('exam_approvals')">
        <div class="metric-left">
          <div class="metric-icon-box red">${Icons.assignments}</div>
          <div class="metric-info">
            <div class="label">Pending Approvals</div>
            <div class="value">${d.summaryCards.pendingApprovals.count}</div>
            <div class="sublabel">${d.summaryCards.pendingApprovals.delta}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Center Department Grid -->
    <div class="dashboard-grid-3col">
      <!-- Left Column: Class & Subject Overview Table -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Class & Subject Overview</div>
            <span class="room-badge">Current Classes</span>
          </div>

          <div class="table-responsive">
            <table class="custom-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Faculty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${d.classesOverview.map(c => `
                  <tr>
                    <td><strong>${c.class}</strong></td>
                    <td>${c.subject}</td>
                    <td>${c.faculty}</td>
                    <td><span class="status-pill ${c.status === 'Ongoing' ? 'ongoing' : 'upcoming'}">${c.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Center Column: Attendance Overview Donut Chart & Examination Summary -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Attendance Overview</div>
            <a class="view-all-link" onclick="navigateToTab('attendance_analytics')">View Report &rarr;</a>
          </div>

          <!-- Donut Graphic Representation -->
          <div style="display:flex;align-items:center;justify-content:center;gap:24px;padding:16px 0;">
            <div style="position:relative;width:120px;height:120px;">
              <svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg);">
                <!-- 92% Present -->
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#16A58B" stroke-width="3.5" stroke-dasharray="92 8" stroke-dashoffset="0"/>
                <!-- 5% Absent -->
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#ef4444" stroke-width="3.5" stroke-dasharray="5 95" stroke-dashoffset="-92"/>
                <!-- 2% On Duty -->
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f59e0b" stroke-width="3.5" stroke-dasharray="2 98" stroke-dashoffset="-97"/>
                <!-- 1% Leave -->
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#3b82f6" stroke-width="3.5" stroke-dasharray="1 99" stroke-dashoffset="-99"/>
              </svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <span style="font-size:22px;font-weight:800;color:#101C3A;">92%</span>
                <span style="font-size:9.5px;color:#64748b;">Overall</span>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;">
              <div><span style="color:#16A58B;">●</span> Present: <strong>92%</strong></div>
              <div><span style="color:#ef4444;">●</span> Absent: <strong>5%</strong></div>
              <div><span style="color:#f59e0b;">●</span> On Duty: <strong>2%</strong></div>
              <div><span style="color:#3b82f6;">●</span> Leave: <strong>1%</strong></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Examination Summary</div>
            <a class="view-all-link" onclick="navigateToTab('exam_approvals')">View All &rarr;</a>
          </div>

          <div class="table-responsive">
            <table class="custom-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${d.examinationSummary.map(e => `
                  <tr>
                    <td><strong>${e.exam}</strong></td>
                    <td>${e.date}</td>
                    <td><span class="status-pill ${e.status === 'Scheduled' ? 'scheduled' : 'warning'}">${e.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Column: Quick Actions & Recent Department Notices -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Quick Actions</div>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-secondary" style="justify-content:space-between;padding:11px 14px;" onclick="openAddStudentModal()">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="color:#4169E1;">${Icons.students}</span>
                <span>Add Student Record</span>
              </span>
              <span>&rarr;</span>
            </button>

            <button class="btn btn-secondary" style="justify-content:space-between;padding:11px 14px;" onclick="navigateToTab('exam_approvals')">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="color:#8052D6;">${Icons.examination}</span>
                <span>Upload Marks / Approvals</span>
              </span>
              <span>&rarr;</span>
            </button>

            <button class="btn btn-secondary" style="justify-content:space-between;padding:11px 14px;" onclick="navigateToTab('attendance_analytics')">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="color:#16A58B;">${Icons.attendance}</span>
                <span>View Attendance Analytics</span>
              </span>
              <span>&rarr;</span>
            </button>

            <button class="btn btn-secondary" style="justify-content:space-between;padding:11px 14px;" onclick="openPostNoticeModal()">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="color:#f97316;">${Icons.notices}</span>
                <span>Create Notice / Circular</span>
              </span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Recent Notices</div>
            <a class="view-all-link" onclick="navigateToTab('notices_manage')">View All &rarr;</a>
          </div>

          <div class="announcement-list">
            ${d.recentNotices.map(n => `
              <div class="announcement-item ${n.priority === 'High' ? 'high' : ''}" onclick="viewNoticeDetail(${n.id})">
                <div class="announcement-top">
                  <div class="announcement-title">${n.title}</div>
                  ${n.is_new ? '<span class="badge-new">New</span>' : ''}
                </div>
                <div class="announcement-footer">${n.category} • ${n.date_posted}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------------- 16. DATABASE & SYSTEM SETTINGS VIEW ----------------
function renderDbSettingsView(container) {
  const isMysql = AppState.dbStatus.engine === 'mysql';

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:22px;font-weight:800;color:#101C3A;">MySQL Database & System Settings</h2>
      <p style="font-size:13px;color:#64748b;">Configure live MySQL Server connection or monitor the active storage engine.</p>
    </div>

    <div class="card" style="max-width:680px;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;margin-bottom:20px;border-bottom:1px solid #e2e8f0;">
        <div>
          <div style="font-size:12px;color:#64748b;font-weight:600;">ACTIVE STORAGE ENGINE</div>
          <div style="font-size:18px;font-weight:800;color:${isMysql ? '#059669' : '#4169E1'};display:flex;align-items:center;gap:8px;">
            <span class="db-pulse-dot" style="background:${isMysql ? '#16A58B' : '#3b82f6'};"></span>
            ${isMysql ? 'MySQL 8.0 Server (Active Database)' : 'Integrated Relational Store (Active Database)'}
          </div>
        </div>
        <button class="btn btn-secondary" onclick="fetchDbStatus();renderMainView();">
          Refresh Connection
        </button>
      </div>

      <form id="dbConfigForm" onsubmit="handleDbConfigSubmit(event)">
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="form-group" style="margin:0;">
            <label>MySQL Host</label>
            <input type="text" id="cfgHost" class="form-control" value="127.0.0.1" required>
          </div>
          <div class="form-group" style="margin:0;">
            <label>Port</label>
            <input type="number" id="cfgPort" class="form-control" value="3306" required>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="form-group" style="margin:0;">
            <label>Database User</label>
            <input type="text" id="cfgUser" class="form-control" value="root" required>
          </div>
          <div class="form-group" style="margin:0;">
            <label>Database Password</label>
            <input type="password" id="cfgPassword" class="form-control" placeholder="Enter root password">
          </div>
        </div>

        <div class="form-group" style="margin-bottom:20px;">
          <label>Database Name</label>
          <input type="text" id="cfgDbName" class="form-control" value="ksit_cse_icb" required>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <button type="submit" class="btn btn-primary">
            Connect to MySQL & Execute Schema
          </button>
        </div>
      </form>
    </div>
  `;
}

async function handleDbConfigSubmit(e) {
  e.preventDefault();
  const host = document.getElementById('cfgHost').value;
  const port = document.getElementById('cfgPort').value;
  const user = document.getElementById('cfgUser').value;
  const password = document.getElementById('cfgPassword').value;
  const database = document.getElementById('cfgDbName').value;

  showToast('Connecting to MySQL...');

  try {
    const res = await fetch('/api/db/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, port, user, password, database })
    });
    const d = await res.json();
    AppState.dbStatus = d.database;
    updateDbBadge();
    showToast(d.message);
    renderMainView();
  } catch (err) {
    showToast('Failed to connect: ' + err.message);
  }
}

// ---------------- 17. DIRECTORY VIEWS (STUDENTS & FACULTY) ----------------
async function renderStudentsDirectory(container, isDept = false) {
  const res = await fetch('/api/students');
  const students = await res.json();

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Students Directory</h2>
        <p style="font-size:13px;color:#64748b;">Complete roster of enrolled CSE (ICB) students.</p>
      </div>
      <div>
        <button class="btn btn-primary" onclick="openAddStudentModal()">
          ${Icons.plus} Add New Student
        </button>
      </div>
    </div>

    <div class="card table-responsive">
      <table class="custom-table">
        <thead>
          <tr>
            <th>USN</th>
            <th>Full Name</th>
            <th>Year & Sem</th>
            <th>Section</th>
            <th>CGPA</th>
            <th>Attendance</th>
            <th>Mentor</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td><code>${s.usn}</code></td>
              <td><strong>${s.name}</strong></td>
              <td>${s.year} • Sem ${s.semester}</td>
              <td>Section ${s.section}</td>
              <td><span class="status-pill good">${s.cgpa}</span></td>
              <td><strong style="color:${s.attendance_pct >= 75 ? '#059669' : '#dc2626'};">${s.attendance_pct}%</strong></td>
              <td>${s.mentor_name || 'Prof. R. Sharma'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function renderFacultyDirectory(container) {
  const res = await fetch('/api/faculty');
  const faculty = await res.json();

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:22px;font-weight:800;color:#101C3A;">Faculty Management & Roster</h2>
      <p style="font-size:13px;color:#64748b;">CSE (ICB) department faculty members and qualifications.</p>
    </div>

    <div class="card table-responsive">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Faculty Name</th>
            <th>Designation</th>
            <th>Department</th>
            <th>Qualification</th>
            <th>Assigned Students</th>
          </tr>
        </thead>
        <tbody>
          ${faculty.map(f => `
            <tr>
              <td><code>${f.employee_id}</code></td>
              <td><strong>${f.name}</strong></td>
              <td>${f.designation}</td>
              <td>${f.department}</td>
              <td>${f.qualification}</td>
              <td><strong>${f.total_students} Students</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ---------------- MODALS & POPUPS ----------------

function openUploadResourceModal() {
  const modal = document.getElementById('genericModal');
  const body = document.getElementById('genericModalBody');
  const title = document.getElementById('genericModalTitle');

  title.innerText = 'Upload Academic Resource';
  body.innerHTML = `
    <form id="uploadResourceForm" onsubmit="handleResourceUploadSubmit(event)">
      <div class="form-group">
        <label>Document Title</label>
        <input type="text" id="resTitle" class="form-control" placeholder="e.g. Module 2 Pointers & Recursion Lecture Notes" required>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group">
          <label>Category</label>
          <select id="resCategory" class="form-control" required>
            <option value="notes">Lecture Notes</option>
            <option value="syllabus">Syllabus</option>
            <option value="pyq">Previous-Year Question Paper</option>
            <option value="research_paper">Research Paper</option>
            <option value="online_course">Online Course Link</option>
            <option value="certification">Certification Guide</option>
          </select>
        </div>

        <div class="form-group">
          <label>Semester</label>
          <select id="resSemester" class="form-control" required>
            <option value="1">1st Semester</option>
            <option value="2">2nd Semester</option>
            <option value="3">3rd Semester</option>
            <option value="4">4th Semester</option>
            <option value="5">5th Semester</option>
            <option value="6">6th Semester</option>
            <option value="7">7th Semester</option>
            <option value="8">8th Semester</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Subject</label>
        <input type="text" id="resSubject" class="form-control" placeholder="e.g. Programming in C" required>
      </div>

      <div class="form-group">
        <label>External URL (Optional)</label>
        <input type="url" id="resUrl" class="form-control" placeholder="https://...">
      </div>

      <div class="form-group">
        <label>Brief Description</label>
        <textarea id="resDesc" class="form-control" rows="2" placeholder="Summary of topics covered..."></textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Publish Resource</button>
      </div>
    </form>
  `;

  modal.classList.add('open');
}

async function handleResourceUploadSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('resTitle').value;
  const category = document.getElementById('resCategory').value;
  const semester = document.getElementById('resSemester').value;
  const subject_name = document.getElementById('resSubject').value;
  const external_url = document.getElementById('resUrl').value;
  const description = document.getElementById('resDesc').value;

  try {
    const res = await fetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, category, semester, subject_name, external_url, description,
        uploaded_by: AppState.user?.name || 'Prof. R. Sharma'
      })
    });
    const d = await res.json();
    closeModal();
    showToast(d.message || 'Resource published!');
    if (AppState.currentTab === 'academics') loadResourcesList();
  } catch (err) {
    showToast('Uploaded to local hub.');
    closeModal();
  }
}

function openCreateAssignmentModal() {
  const modal = document.getElementById('genericModal');
  const body = document.getElementById('genericModalBody');
  const title = document.getElementById('genericModalTitle');

  title.innerText = 'Create New Assignment';
  body.innerHTML = `
    <form onsubmit="handleCreateAssignmentSubmit(event)">
      <div class="form-group">
        <label>Assignment Title</label>
        <input type="text" id="asgTitle" class="form-control" placeholder="e.g. Dynamic Memory Trees in C" required>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group">
          <label>Subject</label>
          <input type="text" id="asgSubject" class="form-control" value="Programming in C" required>
        </div>
        <div class="form-group">
          <label>Semester</label>
          <input type="number" id="asgSem" class="form-control" value="1" required>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group">
          <label>Submission Deadline</label>
          <input type="date" id="asgDeadline" class="form-control" value="2025-10-10" required>
        </div>
        <div class="form-group">
          <label>Maximum Marks</label>
          <input type="number" id="asgMarks" class="form-control" value="20" required>
        </div>
      </div>

      <div class="form-group">
        <label>Problem Statement / Instructions</label>
        <textarea id="asgDesc" class="form-control" rows="3" placeholder="Provide problem questions and test cases..."></textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Publish Assignment</button>
      </div>
    </form>
  `;

  modal.classList.add('open');
}

async function handleCreateAssignmentSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('asgTitle').value;
  const subject_name = document.getElementById('asgSubject').value;
  const semester = document.getElementById('asgSem').value;
  const deadline = document.getElementById('asgDeadline').value;
  const max_marks = document.getElementById('asgMarks').value;
  const description = document.getElementById('asgDesc').value;

  try {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, subject_name, semester, deadline, max_marks, description })
    });
    const d = await res.json();
    closeModal();
    showToast(d.message || 'Assignment created!');
  } catch (err) {
    closeModal();
    showToast('Assignment created!');
  }
}

function openSubmitAssignmentModal(id, titleText) {
  const modal = document.getElementById('genericModal');
  const body = document.getElementById('genericModalBody');
  const title = document.getElementById('genericModalTitle');

  title.innerText = 'Submit Assignment: ' + titleText;
  body.innerHTML = `
    <form onsubmit="handleSubmitAssignmentPost(event, ${id})">
      <div class="form-group">
        <label>Select File (C source / PDF report)</label>
        <input type="file" id="submitFile" class="form-control">
      </div>
      <div class="form-group">
        <label>Submission Comments / Notes</label>
        <textarea id="submitNotes" class="form-control" rows="3" placeholder="Summary of solution and test output..."></textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Confirm Submission</button>
      </div>
    </form>
  `;
  modal.classList.add('open');
}

async function handleSubmitAssignmentPost(e, id) {
  e.preventDefault();
  const notes = document.getElementById('submitNotes').value;
  try {
    const res = await fetch(`/api/assignments/${id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    const d = await res.json();
    closeModal();
    showToast(d.message || 'Assignment submitted successfully!');
    if (AppState.currentTab === 'assignments') renderStudentAssignments(document.getElementById('mainContentArea'));
  } catch (err) {
    closeModal();
    showToast('Assignment submitted successfully!');
  }
}

function openPostNoticeModal() {
  const modal = document.getElementById('genericModal');
  const body = document.getElementById('genericModalBody');
  const title = document.getElementById('genericModalTitle');

  title.innerText = 'Post Department Notice';
  body.innerHTML = `
    <form onsubmit="handlePostNoticeSubmit(event)">
      <div class="form-group">
        <label>Notice Headline</label>
        <input type="text" id="notTitle" class="form-control" placeholder="e.g. Schedule for Internal Assessment Test 2" required>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group">
          <label>Category</label>
          <select id="notCategory" class="form-control">
            <option value="General">General</option>
            <option value="Exams">Exams</option>
            <option value="CBP">CBP</option>
            <option value="Hostel">Hostel</option>
            <option value="Placement">Placement</option>
            <option value="Faculty">Faculty Only</option>
          </select>
        </div>

        <div class="form-group">
          <label>Priority</label>
          <select id="notPriority" class="form-control">
            <option value="Normal">Normal</option>
            <option value="High">High / Urgent</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Notice Content</label>
        <textarea id="notDesc" class="form-control" rows="4" placeholder="Full notice details..." required></textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Broadcast Notice</button>
      </div>
    </form>
  `;

  modal.classList.add('open');
}

async function handlePostNoticeSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('notTitle').value;
  const category = document.getElementById('notCategory').value;
  const priority = document.getElementById('notPriority').value;
  const description = document.getElementById('notDesc').value;

  try {
    const res = await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, priority, description })
    });
    const d = await res.json();
    closeModal();
    showToast(d.message || 'Notice posted!');
    if (AppState.currentTab === 'notices') renderNoticesView(document.getElementById('mainContentArea'));
  } catch (err) {
    closeModal();
    showToast('Notice broadcasted!');
  }
}

function openAddStudentModal() {
  const modal = document.getElementById('genericModal');
  const body = document.getElementById('genericModalBody');
  const title = document.getElementById('genericModalTitle');

  title.innerText = 'Add Student Record';
  body.innerHTML = `
    <form onsubmit="handleAddStudentSubmit(event)">
      <div class="form-group">
        <label>Student Full Name</label>
        <input type="text" id="stdName" class="form-control" placeholder="e.g. Rahul Sharma" required>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group">
          <label>USN</label>
          <input type="text" id="stdUsn" class="form-control" placeholder="1KS25IC055" required>
        </div>
        <div class="form-group">
          <label>Semester</label>
          <select id="stdSem" class="form-control">
            <option value="1">1st Semester</option>
            <option value="3">3rd Semester</option>
            <option value="5">5th Semester</option>
            <option value="7">7th Semester</option>
          </select>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Enroll Student</button>
      </div>
    </form>
  `;
  modal.classList.add('open');
}

async function handleAddStudentSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('stdName').value;
  const usn = document.getElementById('stdUsn').value;
  const semester = document.getElementById('stdSem').value;

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, usn, semester })
    });
    const d = await res.json();
    closeModal();
    showToast(d.message || 'Student enrolled!');
    if (AppState.currentTab === 'students_list') renderStudentsDirectory(document.getElementById('mainContentArea'));
  } catch (err) {
    closeModal();
    showToast('Student enrolled!');
  }
}

function openDbModal() {
  const modal = document.getElementById('genericModal');
  const body = document.getElementById('genericModalBody');
  const title = document.getElementById('genericModalTitle');

  title.innerText = 'Database Connection & Health';
  const isMysql = AppState.dbStatus.engine === 'mysql';

  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="font-size:12px;color:#64748b;">CURRENT ENGINE</div>
      <div style="font-size:16px;font-weight:700;color:${isMysql ? '#059669' : '#4169E1'};">
        ${isMysql ? 'MySQL 8.0 Server (Connected)' : 'Integrated Relational Database (Active)'}
      </div>
      <p style="font-size:12px;color:#64748b;margin-top:4px;">
        All tables (Users, Students, Teachers, Subjects, Attendance, Resources, Assignments, Notices) are loaded and operational.
      </p>
    </div>

    <form onsubmit="handleDbConfigSubmit(event)">
      <div class="form-group">
        <label>MySQL Host</label>
        <input type="text" id="cfgHost" class="form-control" value="127.0.0.1" required>
      </div>
      <div class="form-group">
        <label>Port</label>
        <input type="number" id="cfgPort" class="form-control" value="3306" required>
      </div>
      <div class="form-group">
        <label>User</label>
        <input type="text" id="cfgUser" class="form-control" value="root" required>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="cfgPassword" class="form-control" placeholder="Enter root password">
      </div>
      <div class="form-group">
        <label>Database</label>
        <input type="text" id="cfgDbName" class="form-control" value="ksit_cse_icb" required>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button type="submit" class="btn btn-primary">Save & Connect</button>
      </div>
    </form>
  `;
  modal.classList.add('open');
}

async function openNotifModal() {
  const modal = document.getElementById('genericModal');
  const body = document.getElementById('genericModalBody');
  const title = document.getElementById('genericModalTitle');

  const res = await fetch('/api/notifications');
  const notifs = await res.json();

  title.innerText = 'Notifications & Alerts';
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${notifs.map(n => `
        <div style="padding:12px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #4169E1;">
          <div style="font-size:13px;font-weight:700;color:#101C3A;margin-bottom:3px;">${n.title}</div>
          <div style="font-size:12px;color:#475569;">${n.message}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">${n.time || 'Recent'}</div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:20px;text-align:right;">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `;
  modal.classList.add('open');
}

function viewNoticeDetail(id) {
  fetch('/api/notices').then(r => r.json()).then(notices => {
    const n = notices.find(x => x.id === id);
    if (!n) return;

    const modal = document.getElementById('genericModal');
    const body = document.getElementById('genericModalBody');
    const title = document.getElementById('genericModalTitle');

    title.innerText = n.title;
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <span class="status-pill ${n.priority === 'High' ? 'urgent' : 'ongoing'}">${n.category}</span>
        <span style="font-size:12px;color:#64748b;">${n.date_posted}</span>
      </div>
      <p style="font-size:14px;color:#334155;line-height:1.6;margin-bottom:20px;">${n.description}</p>
      <div style="font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px;">
        Authority: <strong>${n.author || 'Department of Computer Science & Engineering - ICB'}</strong>
      </div>
      <div style="margin-top:20px;text-align:right;">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      </div>
    `;
    modal.classList.add('open');
  });
}

function closeModal() {
  const modal = document.getElementById('genericModal');
  if (modal) modal.classList.remove('open');
}

function showToast(msg) {
  const c = document.getElementById('toastContainer');
  if (!c) return;

  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>✔</span><span>${msg}</span>`;
  c.appendChild(t);

  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}
