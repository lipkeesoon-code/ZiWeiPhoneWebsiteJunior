// app.js - ZiWi Mobile Edition

const State = {
    groups: JSON.parse(localStorage.getItem('ziwi_groups')) || [{ id: 'default', name: '默认群组' }],
    records: JSON.parse(localStorage.getItem('ziwi_records')) || [],
    defaultGroupId: localStorage.getItem('ziwi_default_group') || '',
    currentActiveRecord: null,
    isLoggedIn: localStorage.getItem('ziwi_auth') === 'true',
    isAdmin: localStorage.getItem('ziwi_role') === 'admin',
    userEmail: localStorage.getItem('ziwi_user_email') || '',
    memberLevel: localStorage.getItem('ziwi_member_level') || 'basic',
    
    // Member Management (Simplified Mock for now)
    approvedMembers: JSON.parse(localStorage.getItem('ziwi_approved_members')) || [
        { email: 'student@example.com', deviceId: 'iphone_15_lock', status: 'bound' }
    ],


    mgPalaceArray: null,
    birthSiHua: {},
    activeFlyingPalaceIdx: null,

    activeReceivingStarName: null,
    lastUsedGroupId: localStorage.getItem('ziwi_last_used_group') || '',
    activeReceivingStarInfo: null,
    selectedPalaceIndices: new Set(),

    collapsedGroups: new Set(JSON.parse(localStorage.getItem('ziwi_collapsed_groups')) || []),
    lastRenderedRecordId: null,


    isLongPressSession: false,
};

// --- Task: Global Cleanup for Group Names (Removing "Folder", "Group", "名称", "群组" prefixes) ---
State.groups.forEach(g => {
    if (g.name && g.id !== 'default') {
        g.name = g.name.replace(/^((群组|Folder|Group|名称|文件夹|群组名)[:：\s]*)+/gi, '').trim();
    }
});

const WIFI_STAR_WHITELIST = ['武曲', '贪狼', '天机', '天同', '太阴', '破军', '巨门', '太阳', '廉贞', '天梁', '紫微', '左辅', '右弼', '文曲', '文昌'];

const UI = {
    phoneContainer: document.getElementById('phone-container'),
    bottomNav: document.getElementById('bottom-nav'),
    views: document.querySelectorAll('.app-view'),
    navItems: document.querySelectorAll('.nav-item'),
    
    // Login
    loginEmail: document.getElementById('login-email'),
    loginPass: document.getElementById('login-pass'),
    btnLogin: document.getElementById('btn-login-submit'), // Updated ID
    loginError: document.getElementById('login-error'),
    portalBtns: document.getElementById('portal-buttons'),
    loginFormContainer: document.getElementById('login-form-container'),
    loginFormTitle: document.getElementById('login-form-title'),
    adminIconContainer: document.getElementById('admin-icon-container'),

    btnPortalAdmin: document.getElementById('btn-portal-admin'),
    btnPortalMember: document.getElementById('btn-portal-member'),
    btnLoginBack: document.getElementById('btn-login-back'),
    btnLogout: document.getElementById('btn-logout'),

    // Admin Settings
    approvedMemberList: document.getElementById('approved-member-list'),
    btnAdminBack: document.getElementById('btn-admin-back'),
    btnAddMember: document.getElementById('btn-add-member'),
    
    // Input
    gregYear: document.getElementById('greg-year'),
    gregMonth: document.getElementById('greg-month'),
    gregDay: document.getElementById('greg-day'),
    gregTime: document.getElementById('greg-time'),
    lunarDisplay: document.getElementById('lunar-date-display'),
    userName: document.getElementById('user-name'),
    btnSaveChart: document.getElementById('btn-save-chart'),
    btnNewChart: document.getElementById('btn-new-chart'),

    // Records
    groupList: document.getElementById('group-list'),
    addGroupBtn: document.getElementById('add-group-btn'),
    recordSearch: document.getElementById('record-search'),
    
    // Main Board
    mainBoard: document.getElementById('main-board'),
    cName: document.getElementById('c-name'),
    cGregorian: document.getElementById('c-gregorian'),
    cLunar: document.getElementById('c-lunar'),
    cGender: document.getElementById('c-gender'),
    cZodiac: document.getElementById('c-zodiac'),
    cElements: document.getElementById('c-elements'),
    cAge: document.getElementById('c-age'),
    cFormation: document.getElementById('c-formation'),
    infoListMobile: document.getElementById('info-list-mobile'),
    
    // Global Funcs
    snapshotBtn: document.getElementById('snapshot-btn'),
    importBtn: document.getElementById('import-btn'),
    importFileInput: document.getElementById('import-file-input'),
    bgChangeBtn: document.getElementById('bg-change-btn'),
    bgUploadInput: document.getElementById('bg-upload-input'),
    bgLayer: document.getElementById('bg-layer'),
    
    // Gallery
    btnChangePass: document.getElementById('change-pass-btn'),
    btnCloudSync: document.getElementById('btn-cloud-sync')
};



// --- View Router ---
function switchView(viewId) {
    UI.views.forEach(v => v.classList.remove('active'));
    UI.navItems.forEach(item => item.classList.remove('active'));

    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const targetNav = Array.from(UI.navItems).find(i => i.dataset.view === viewId);
    if (targetNav) targetNav.classList.add('active');
}

// --- Auth System ---
const ADMIN_EMAIL = "lipkeesoon@hotmail.com";
const ADMIN_PASS = "matahari521413";
const TEST_ADMIN_EMAIL = "lipkeesoon@gmail.com";
const TEST_ADMIN_PASS = "wahaha21";

// --- Security Portal System ---
let selectedRole = 'member';

const SHUTTER_SOUND_URL = "img/Canon DSLR Shutter Sound.mp3";

// --- Task: Permanent Login & Device Recognition ---
function getReadableDeviceName() {
    const ua = navigator.userAgent;
    let device = "未知设备";
    if (/iPhone/i.test(ua)) device = "iPhone";
    else if (/iPad/i.test(ua)) device = "iPad";
    else if (/Android/i.test(ua)) device = "Android 手机";
    else if (/Mac OS X/i.test(ua)) device = "Mac 电脑";
    else if (/Windows/i.test(ua)) device = "Windows 电脑";
    return device;
}

function generateDeviceFingerprint() {
    // Generate a unique hash based on browser hardware signals
    const signals = [
        navigator.userAgent,
        screen.width + "x" + screen.height,
        navigator.language,
        new Date().getTimezoneOffset(),
        !!window.chrome
    ];
    return btoa(signals.join("|")).substring(0, 32); 
}

function validateDevice() {
    if (!State.isLoggedIn) return;
    
    // Admins are exempt from hard device-lock (Check both role and email for safety)
    if (State.isAdmin || State.userEmail === ADMIN_EMAIL || State.userEmail === TEST_ADMIN_EMAIL) return;

    const currentFingerprint = generateDeviceFingerprint();
    const storedFingerprint = localStorage.getItem('ziwi_device_fingerprint');

    if (storedFingerprint && currentFingerprint !== storedFingerprint) {
        // PROMPT DETECTION: Fingerprint mismatch found!
        console.warn("Security Alert: Device fingerprint mismatch detected.");
        showLockdownOverlay();
    }
}

function showLockdownOverlay() {
    const overlay = document.getElementById('security-lockdown');
    if (overlay) overlay.style.display = 'flex';
    // Disable access to core functions
    State.isLoggedIn = false;
    localStorage.removeItem('ziwi_auth');
}

function showLoginForm(role) {
    selectedRole = role;
    UI.portalBtns.style.display = 'none';
    UI.loginFormContainer.style.display = 'block';
    UI.loginFormTitle.textContent = (role === 'admin' ? '管理员登入 / Admin' : '初级会员登入 / Junior Member Login');
    UI.loginError.textContent = "";
}

function hideLoginForm() {
    UI.portalBtns.style.display = 'flex';
    UI.loginFormContainer.style.display = 'none';
}

UI.btnPortalAdmin.addEventListener('click', () => showLoginForm('admin'));
UI.btnPortalMember.addEventListener('click', () => showLoginForm('member'));
UI.btnLoginBack.addEventListener('click', hideLoginForm);

// --- Cloud Sync Configuration (Google Sheets API Implementation) ---
const CLOUD_SYNC_URL = "https://script.google.com/macros/s/AKfycbyrK_oxH3Nw6wKh1Kr4_1xp8rwrjR2TnDJNgl1qlPPt4voonb9GGjQhd83Z48i5eesL/exec"; 
const ADMIN_SYNC_KEY = "Love521"; // Admin authorization key

async function syncMembers(mode = 'download') {
    try {
        if (mode === 'upload') {
            const secret = prompt("请输入管理员同步密钥 (Admin Secret Key):");
            if (secret !== ADMIN_SYNC_KEY) {
                return alert("❌ 密钥错误，无权同步云端名单。");
            }

            const btn = UI.btnCloudSync;
            if (!btn) return;
            const originalText = btn.textContent;
            btn.textContent = "⏳ 正在上传...";
            btn.disabled = true;

            // Google Sheets requires POST for updates. We use 'no-cors' for simple fire-and-forget sync 
            // since Google Scripts redirections can be tricky with standard fetch.
            await fetch(CLOUD_SYNC_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' }, // Avoid preflight
                body: JSON.stringify({
                    type: 'Junior',
                    members: State.approvedMembers
                })
            });

            // Give Google a moment to process before UI feedback
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                alert("✅ 云端同步成功！全球学员现在可以顺利登录了。");
            }, 1200);

        } else {
            // Background download (Reading from specific sheet tab)
            const response = await fetch(`${CLOUD_SYNC_URL}?type=Junior`);
            if (response.ok) {
                const cloudMembers = await response.json();
                if (Array.isArray(cloudMembers) && cloudMembers.length > 0) {
                    State.approvedMembers = cloudMembers;
                    saveMemberState();
                    renderApprovedMembers();

                    // CRITICAL FIX: If already logged in, refresh the membership level from the new cloud data
                    if (State.isLoggedIn && State.userEmail) {
                        const currentUser = cloudMembers.find(m => m.email.toLowerCase() === State.userEmail.toLowerCase());
                        if (currentUser) {
                            const newLevel = currentUser.level || 'basic';
                            if (State.memberLevel !== newLevel) {
                                console.log(`Membership level updated from cloud: ${newLevel}`);
                                State.memberLevel = newLevel;
                                localStorage.setItem('ziwi_member_level', newLevel);
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn("Cloud sync error:", e.message);
        if (mode === 'upload') {
            alert("❌ 同步失败：" + e.message + "\n请尝试切换网络或稍后再试。");
            if (UI.btnCloudSync) {
                UI.btnCloudSync.disabled = false;
                UI.btnCloudSync.textContent = "☁️ 云端同步";
            }
        }
    }
}

if (UI.btnCloudSync) {
    UI.btnCloudSync.addEventListener('click', () => {
        if (confirm("确定要将当前的授权名单同步到云端吗？这将覆盖云端的旧名单。")) {
            syncMembers('upload');
        }
    });
}

function checkAuth() {
    if (State.isLoggedIn) {
        UI.bottomNav.style.display = 'flex';
        switchView('view-records');
        handleAdminPrivileges();
        
        // Show change password button only for regular members
        if (UI.btnChangePass) UI.btnChangePass.style.display = State.isAdmin ? 'none' : 'block';
        
        validateDevice(); // Perform the hardware check on start
    } else {
        UI.bottomNav.style.display = 'none';
        switchView('view-login');
        hideAdminPrivileges();
    }
    
    // Always sync members from cloud on startup to ensure latest authorization/levels
    syncMembers('download');
}

function handleAdminPrivileges() {
    if (State.isAdmin) {
        // Inject the Admin Spanner Icon in the "New Record" header
        if (!document.getElementById('admin-spanner')) {
            const spanner = document.createElement('button');
            spanner.id = 'admin-spanner';
            spanner.className = 'admin-setting-header-btn';
            spanner.innerHTML = `<img src="img/Member Setting Icon .png" alt="Settings">`;
            spanner.onclick = () => {
                switchView('view-admin-settings');
                renderApprovedMembers();
            };
            UI.adminIconContainer.appendChild(spanner);
        }
    } else {
        hideAdminPrivileges();
    }
}

function hideAdminPrivileges() {
    const spanner = document.getElementById('admin-spanner');
    if (spanner) spanner.remove();
}

UI.btnLogin.addEventListener('click', () => {
    const email = UI.loginEmail.value.trim();
    const pass = UI.loginPass.value.trim();
    
    // Admin Override: Allow admin account to enter through either portal
    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
        State.isLoggedIn = true;
        // isAdmin depends on which portal they used as requested
        State.isAdmin = (selectedRole === 'admin'); 
        State.userEmail = email;
        localStorage.setItem('ziwi_auth', 'true');
        localStorage.setItem('ziwi_role', State.isAdmin ? 'admin' : 'member');
        localStorage.setItem('ziwi_user_email', email);
        localStorage.setItem('ziwi_member_level', 'premium'); // Admins are always premium
        State.memberLevel = 'premium';
        checkAuth();
        return;
    }

    // Tester Admin: lipkeesoon@gmail.com
    if (email === TEST_ADMIN_EMAIL && pass === TEST_ADMIN_PASS) {
        State.isLoggedIn = true;
        State.isAdmin = (selectedRole === 'admin'); 
        State.userEmail = email;
        const testMemberConfig = State.approvedMembers.find(m => m.email === email);
        const testLevel = testMemberConfig ? (testMemberConfig.level || 'basic') : 'basic';
        State.memberLevel = testLevel;
        localStorage.setItem('ziwi_auth', 'true');
        localStorage.setItem('ziwi_role', State.isAdmin ? 'admin' : 'member');
        localStorage.setItem('ziwi_user_email', email);
        localStorage.setItem('ziwi_member_level', testLevel);
        checkAuth();
        return;
    }

    if (selectedRole === 'admin') {
        // Normal admin check (already covered above, but kept for clarity/fallback)
        UI.loginError.textContent = "管理密钥错误。";
    } else {
        // Member Auth Logic (One ID One Device Simulation)
        const member = State.approvedMembers.find(m => m.email === email);
        const storedPass = localStorage.getItem(`ziwi_pass_${email}`) || "123456";
        
        if (member && pass === storedPass) { 
            State.isLoggedIn = true;
            State.isAdmin = false;
            State.userEmail = email;
            localStorage.setItem('ziwi_auth', 'true');
            localStorage.setItem('ziwi_role', 'member');
            localStorage.setItem('ziwi_user_email', email);
            localStorage.setItem('ziwi_member_level', member.level || 'basic');
            State.memberLevel = member.level || 'basic';
            
            // BIND DEVICE: On first successful login or if deviceId is null (reset)
            const fingerprint = generateDeviceFingerprint();
            localStorage.setItem('ziwi_device_fingerprint', fingerprint);
            
            // Update the mock database with readable device name so Admin can see it
            if (!member.deviceId) {
                const readableName = getReadableDeviceName();
                member.deviceId = `${readableName} (${fingerprint.substring(0, 6)})`;
                saveMemberState();
            }
            
            checkAuth();
        } else {
            UI.loginError.textContent = "账号未授权或设备绑定失败。";
        }
    }
});

UI.btnLogout.addEventListener('click', () => {
    if (confirm("确定要登出系统吗？")) {
        State.isLoggedIn = false;
        localStorage.removeItem('ziwi_auth');
        localStorage.removeItem('ziwi_role');
        // We do *not* remove ziwi_device_fingerprint or ziwi_approved_members here, 
        // as the device remains bound to the authorized user.
        location.reload(); // Reload to reset all states securely
    }
});

// Member Password Change
if (UI.btnChangePass) {
    UI.btnChangePass.addEventListener('click', () => {
        const newPass = prompt("请输入您的新密码:");
        if (newPass && newPass.length >= 6) {
            const confirmPass = prompt("请再次确认新密码:");
            if (newPass === confirmPass) {
                localStorage.setItem(`ziwi_pass_${State.userEmail}`, newPass);
                alert("密码修改成功！下次登入请使用新密码。");
            } else {
                alert("两次输入的密码不一致，修改失败。");
            }
        } else if (newPass) {
            alert("密码长度至少需要 6 位。");
        }
    });
}

function renderApprovedMembers() {
    UI.approvedMemberList.innerHTML = '';
    State.approvedMembers.forEach((m, idx) => {
        const item = document.createElement('div');
        item.className = 'member-item';
        item.innerHTML = `
            <div class="m-info">
                <span class="m-email">${m.name ? m.name + ' - ' : ''}${m.email}</span>
                <span class="m-device ${m.deviceId?'':'no-device'}">${m.deviceId ? '🔒 绑定于: '+m.deviceId : '⏳ 等待首次登入绑定'}</span>
            </div>
            <div class="m-actions" style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">
                <button onclick="resetDevice(${idx})">重置手机锁</button>
                <button class="btn-danger-light" onclick="deleteMember(${idx})">删除</button>
            </div>
        `;
        UI.approvedMemberList.appendChild(item);
    });
}



window.resetDevice = (idx) => {
    if (confirm("确定要为该会员重置设备绑定吗？他下次登入将录入新指纹。")) {
        State.approvedMembers[idx].deviceId = null;
        State.approvedMembers[idx].status = 'pending';
        saveMemberState();
        renderApprovedMembers();
    }
};

window.deleteMember = (idx) => {
    if (confirm("确定删除该会员吗？")) {
        State.approvedMembers.splice(idx, 1);
        saveMemberState();
        renderApprovedMembers();
    }
};

UI.btnAdminBack.addEventListener('click', () => switchView('view-input'));

UI.btnAddMember.addEventListener('click', () => {
    const email = prompt("【第一步】请输入要授权的会员 / 学生 Email:");
    if (email) {
        let name = prompt("【第二步】请输入学生姓名或备注 (选填):") || "未命名学生";
        let phone = prompt("【第三步】请输入学生电话号码 (选填):") || "无";
        
        State.approvedMembers.push({ 
            email: email, 
            name: name,
            phone: phone,
            level: 'premium',
            deviceId: null, 
            status: 'pending' 
        });
        saveMemberState();
        renderApprovedMembers();
        alert(`已成功添加学生：${name} (${email})\n密码默认为 123456\n学生登入时，系统会自动捕捉并绑定其手机型号。`);
    }
});

function saveMemberState() {
    localStorage.setItem('ziwi_approved_members', JSON.stringify(State.approvedMembers));
}

// --- Core Data Logic ---
function saveState() {
    localStorage.setItem('ziwi_groups', JSON.stringify(State.groups));
    localStorage.setItem('ziwi_records', JSON.stringify(State.records));
    localStorage.setItem('ziwi_collapsed_groups', JSON.stringify([...State.collapsedGroups]));
    localStorage.setItem('ziwi_last_used_group', State.lastUsedGroupId || '');
}

const SIHUA_TABLE = {
    "甲": { "廉贞": "禄", "破军": "权", "武曲": "科", "太阳": "忌" },
    "乙": { "天机": "禄", "天梁": "权", "紫微": "科", "太阴": "忌" },
    "丙": { "天同": "禄", "天机": "权", "文昌": "科", "廉贞": "忌" },
    "丁": { "太阴": "禄", "天同": "权", "天机": "科", "巨门": "忌" },
    "戊": { "贪狼": "禄", "太阴": "权", "右弼": "科", "天机": "忌" },
    "己": { "武曲": "禄", "贪狼": "权", "天梁": "科", "文曲": "忌" },
    "庚": { "太阳": "禄", "武曲": "权", "太阴": "科", "天同": "忌" },
    "辛": { "巨门": "禄", "太阳": "权", "文曲": "科", "文昌": "忌" },
    "壬": { "天梁": "禄", "紫微": "权", "左辅": "科", "武曲": "忌" },
    "癸": { "破军": "禄", "巨门": "权", "太阴": "科", "贪狼": "忌" }
};

const TimePeriods = [
    { zhi: "子", label: "子时 (11pm-1am)" }, { zhi: "丑", label: "丑时 (1am-3am)" },
    { zhi: "寅", label: "寅时 (3am-5am)" }, { zhi: "卯", label: "卯时 (5am-7am)" },
    { zhi: "辰", label: "辰时 (7am-9am)" }, { zhi: "巳", label: "巳时 (9am-11am)" },
    { zhi: "午", label: "午时 (11am-1pm)" }, { zhi: "未", label: "未时 (1pm-3pm)" },
    { zhi: "申", label: "申时 (3pm-5pm)" }, { zhi: "酉", label: "酉时 (5pm-7pm)" },
    { zhi: "戌", label: "戌时 (7pm-9pm)" }, { zhi: "亥", label: "亥时 (9pm-11pm)" }
];

function initDropdowns() {
    for (let y = 1910; y <= 2150; y++) UI.gregYear.add(new Option(y + '年', y));
    for (let m = 1; m <= 12; m++) UI.gregMonth.add(new Option(m + '月', m));
    updateDaysDropdown();
    TimePeriods.forEach(tp => UI.gregTime.add(new Option(tp.label, tp.zhi)));
    [UI.gregYear, UI.gregMonth, UI.gregDay, UI.gregTime].forEach(el => {
        el.addEventListener('change', () => {
            if (el === UI.gregYear || el === UI.gregMonth) updateDaysDropdown();
            updateLunarDisplay();
        });
    });
    // Add gender change listener for auto-fill update
    document.querySelectorAll('input[name="gender"]').forEach(radio => {
        radio.addEventListener('change', updateLunarDisplay);
    });
}

function updateDaysDropdown() {
    const y = parseInt(UI.gregYear.value);
    const m = parseInt(UI.gregMonth.value);
    const daysInMonth = new Date(y, m, 0).getDate() || 31;
    const currentDay = parseInt(UI.gregDay.value) || 1;
    UI.gregDay.innerHTML = '';
    for (let d = 1; d <= daysInMonth; d++) UI.gregDay.add(new Option(d + '日', d));
    if (currentDay <= daysInMonth) UI.gregDay.value = currentDay;
}

function updateLunarDisplay() {
    const y = parseInt(UI.gregYear.value);
    const m = parseInt(UI.gregMonth.value);
    const d = parseInt(UI.gregDay.value);
    const timeZhi = UI.gregTime.value;

    try {
        const lunar = LunarTools.solar2lunar(y, m, d);
        
        // Task 020: Calculate Day of the week
        const dateObj = new Date(y, m - 1, d);
        const dayOfWeek = dateObj.getDay(); // 0 (Sun) to 6 (Sat)
        const dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
        const dayText = dayNames[dayOfWeek];
        
        let dayClass = "weekday-text"; // Default for Mon-Fri (C73 M12 Y100 K1)
        if (dayOfWeek === 0) dayClass = "sunday-text"; // Sunday (C14 M89 Y54 K1)
        else if (dayOfWeek === 6) dayClass = "saturday-text"; // Saturday (C95 M85 Y13 K2)

        UI.lunarDisplay.innerHTML = `
            <div class="lunar-date-row">${lunar.gzYear} ${lunar.lMonth}月 ${lunar.lDay}日 ${timeZhi}时</div>
            <div class="lunar-date-row ${dayClass}">${dayText}</div>
        `;
    } catch (e) { 
        UI.lunarDisplay.textContent = '---'; 
    }
}


function resetToToday() {
    const today = new Date();
    UI.gregYear.value = today.getFullYear();
    UI.gregMonth.value = today.getMonth() + 1;
    updateDaysDropdown();
    UI.gregDay.value = today.getDate();
    let zhiIndex = Math.floor((today.getHours() + 1) / 2) % 12;
    UI.gregTime.value = TimePeriods[zhiIndex].zhi;
    UI.userName.value = '未知';
    updateLunarDisplay();
}

function renderGroups() {
    if (!UI.groupList) return;
    UI.groupList.innerHTML = '';
    
    // Search bar was removed from UI, so searchTerm is empty
    const searchTerm = '';
    
    State.groups.forEach(g => {
        const groupRecords = State.records.filter(r => r.groupId === g.id);
            
        if (groupRecords.length === 0 && searchTerm) return;
        
        const gWrapper = document.createElement('div');
        gWrapper.className = 'group-wrapper';
        const isCollapsed = State.collapsedGroups.has(g.id);
        const isActive = State.lastUsedGroupId === g.id;
        
        const gHeader = document.createElement('div');
        gHeader.className = `group-header ${isCollapsed ? 'collapsed' : ''}`;
        gHeader.innerHTML = `<span class="group-radio-dot ${isActive?'active':''}"></span> 📂 ${g.name}`;
        
        // Manual Double-Tap/Click Detection (Robust for Mobile & Desktop)
        let lastTap = 0;
        let tapTimeout;
        gHeader.addEventListener('click', (e) => {
            const now = new Date().getTime();
            const timesince = now - lastTap;
            
            if (e.target.classList.contains('group-radio-dot')) {
                State.lastUsedGroupId = g.id;
                saveState(); renderGroups();
                return;
            }

            if (timesince < 300 && timesince > 0) {
                // DOUBLE TAP DETECTED -> COLLAPSE ALL
                clearTimeout(tapTimeout);
                State.groups.forEach(group => State.collapsedGroups.add(group.id));
                saveState(); renderGroups();
            } else {
                // SINGLE TAP DETECTED -> TOGGLE INDIVIDUAL GROUP
                tapTimeout = setTimeout(() => {
                    if (State.collapsedGroups.has(g.id)) State.collapsedGroups.delete(g.id);
                    else State.collapsedGroups.add(g.id);
                    saveState(); renderGroups();
                }, 300);
            }
            lastTap = now;
        });

        // Long press / Right click for context menu
        gHeader.addEventListener('contextmenu', (e) => showContextMenu(e, 'group', g.id));
        setupLongPress(gHeader, (e) => showContextMenu(e, 'group', g.id));
        
        gWrapper.appendChild(gHeader);
        
        if (!isCollapsed) {
            groupRecords.forEach(r => {
                const rDiv = document.createElement('div');
                rDiv.className = `record-item ${State.currentActiveRecord?.id === r.id ? 'active' : ''}`;
                
                const genderTag = r.gender === 'M' ? '<span class="gender-m">(男)</span>' : '<span class="gender-f">(女)</span>';
                
                rDiv.innerHTML = `
                    <div class="name-row">📄 ${r.name} ${genderTag}</div>
                    <div class="date-row">${r.gregYear}年${r.gregMonth}月${r.gregDay}日 ${r.gregTime}时</div>
                `;
                rDiv.onclick = (e) => {
                    e.stopPropagation();
                    // Instant feedback: switch view first
                    switchView('view-main');
                    // Render in background to avoid blocking the transition
                    setTimeout(() => {
                        State.currentActiveRecord = r;
                        renderMainBoard(r);
                    }, 60);
                };
                
                rDiv.addEventListener('contextmenu', (e) => showContextMenu(e, 'record', r.id));
                setupLongPress(rDiv, (e) => showContextMenu(e, 'record', r.id));
                
                gWrapper.appendChild(rDiv);
            });
        }
        UI.groupList.appendChild(gWrapper);
    });
}

// Add Group Button Listener
UI.addGroupBtn.addEventListener('click', () => {
    const name = prompt("请输入新群组名称:");
    if (name) {
        State.groups.push({ id: 'g_' + Date.now(), name: name });
        saveState();
        renderGroups();
    }
});

// --- Interaction Logic (Centralized) ---

// --- Task 010b: Energy Arrows System ---
function getEnergyArrowPoints(idx, total, current) {
    // Relative coordinates for the 12 origin points on the 2x2 center area border
    // idx: palace index in ['si','wu','wei','shen','you','xu','hai','zi','chou','yin','mao','chen']
    const origins = [
        { x: 0,   y: 0,   tx: 100, ty: 100 }, // si -> hai
        { x: 25,  y: 0,   tx: 75,  ty: 100 }, // wu -> zi
        { x: 75,  y: 0,   tx: 25,  ty: 100 }, // wei -> chou
        { x: 100, y: 0,   tx: 0,   ty: 100 }, // shen -> yin
        { x: 100, y: 25,  tx: 0,   ty: 75  }, // you -> mao
        { x: 100, y: 75,  tx: 0,   ty: 25  }, // xu -> chen
        { x: 100, y: 100, tx: 0,   ty: 0   }, // hai -> si
        { x: 75,  y: 100, tx: 25,  ty: 0   }, // zi -> wu
        { x: 25,  y: 100, tx: 75,  ty: 0   }, // chou -> wei
        { x: 0,   y: 100, tx: 100, ty: 0   }, // yin -> shen
        { x: 0,   y: 75,  tx: 100, ty: 25  }, // mao -> you
        { x: 0,   y: 25,  tx: 100, ty: 75  }  // chen -> xu
    ];

    const origin = origins[idx];
    
    // Calculate accurate direction vector
    const dxVal = origin.tx - origin.x;
    const dyVal = origin.ty - origin.y;
    const mag = Math.sqrt(dxVal * dxVal + dyVal * dyVal);
    const dir = { x: dxVal / mag, y: dyVal / mag };

    const offsetStep = 5; // Reduced from 8 for finer parallel lines
    let offsetX = 0, offsetY = 0;

    if (total > 1) {
        const startOffset = -( (total - 1) * offsetStep ) / 2;
        const currentOffset = startOffset + (current * offsetStep);
        
        // Perpendicular offset (rotate vector 90 degrees)
        offsetX = -dir.y * currentOffset;
        offsetY = dir.x * currentOffset;
    }

    return { x: origin.x, y: origin.y, dx: dir.x, dy: dir.y, ox: offsetX, oy: offsetY };
}

function renderEnergyArrows(record, mgStarArray) {
    const centerArea = document.querySelector('.center-area');
    if (!centerArea) return;

    // Remove old layer
    const oldLayer = centerArea.querySelector('.energy-arrows-layer');
    if (oldLayer) oldLayer.remove();

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "energy-arrows-layer");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    
    // Color Palette based on User 010b Update
    const COLOR_MAP = {
        '禄': '#3FB532', // C76 M0 Y100 K0
        '权': '#1F7AFC', // C88 M52 Y1 K0
        '科': '#F5A832', // C1 M36 Y87 K0
        '忌': '#E60012'  // C0 M99 Y100 K0
    };

    // Create Markers
    Object.entries(COLOR_MAP).forEach(([type, color]) => {
        // Single Head (Reduced Size)
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", `marker-head-${type}`);
        marker.setAttribute("markerWidth", "4");
        marker.setAttribute("markerHeight", "4");
        marker.setAttribute("refX", "3.5");
        marker.setAttribute("refY", "2");
        marker.setAttribute("orient", "auto");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M0,0 L4,2 L0,4 Z");
        path.setAttribute("fill", color);
        marker.appendChild(path);
        defs.appendChild(marker);

        // Double Head (Reverse side - Reduced Size)
        const markerRev = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        markerRev.setAttribute("id", `marker-rev-${type}`);
        markerRev.setAttribute("markerWidth", "4");
        markerRev.setAttribute("markerHeight", "4");
        markerRev.setAttribute("refX", "0.5");
        markerRev.setAttribute("refY", "2");
        markerRev.setAttribute("orient", "auto");
        const pathRev = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathRev.setAttribute("d", "M4,0 L0,2 L4,4 Z");
        pathRev.setAttribute("fill", color);
        markerRev.appendChild(pathRev);
        defs.appendChild(markerRev);
    });
    svg.appendChild(defs);

    const palaces = ['si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'zi', 'chou', 'yin', 'mao', 'chen'];
    const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const PALACE_ZHIS = ['巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰'];
    const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

    // 1. Scan for energy
    const arrowData = [];
    const birthSiHua = State.birthSiHua || {};

    // Get current chart stems start index (Wu Hu Dun)
    const lunar = LunarTools.solar2lunar(parseInt(record.gregYear), parseInt(record.gregMonth), parseInt(record.gregDay));
    const tianGan = lunar.gzYear.charAt(0);
    const startStemIdx_Yin = ((HEAVENLY_STEMS.indexOf(tianGan) % 5) * 2 + 2) % 10;

    palaces.forEach((p, idx) => {
        const bIdx = EARTHLY_BRANCHES.indexOf(PALACE_ZHIS[idx]);
        const stem = HEAVENLY_STEMS[(startStemIdx_Yin + (bIdx-2+12)%12)%10];
        const transformations = SIHUA_TABLE[stem];
        if (!transformations) return;

        // Opposite index
        const oppIdx = (idx + 6) % 12;
        const targetStars = mgStarArray[EARTHLY_BRANCHES.indexOf(PALACE_ZHIS[oppIdx])];

        for (let sName in transformations) {
            if (targetStars.includes(sName)) {
                const type = transformations[sName];
                // Check for Counter-flow (same star has birth year transformation of same type)
                const isCounter = birthSiHua[sName] === type;
                
                arrowData.push({
                    sourceIdx: idx,
                    starName: sName,
                    type: type,
                    isCounter: isCounter
                });
            }
        }
    });

    // 2. Draw Grouped Arrows
    const grouped = {};
    arrowData.forEach(a => {
        if (!grouped[a.sourceIdx]) grouped[a.sourceIdx] = [];
        grouped[a.sourceIdx].push(a);
    });

    // Center area dimensions in pixels (to apply offset correctly)
    const rect = centerArea.getBoundingClientRect();
    const cw = rect.width || 183;
    const ch = rect.height || 275;

    for (let sIdx in grouped) {
        const list = grouped[sIdx];
        list.forEach((a, i) => {
            const p = getEnergyArrowPoints(parseInt(sIdx), list.length, i);
            const color = COLOR_MAP[a.type];

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            
            // Percentage coordinates for start/end
            const x1 = p.x + (p.ox / cw) * 100;
            const y1 = p.y + (p.oy / ch) * 100;
            
            // Length: 22.5 (50% of the original 45) for refined look
            const length = 22.5; 
            const x2 = x1 + p.dx * (length * (cw/ch > 1 ? 1 : ch/cw * 0.7));
            const y2 = y1 + p.dy * (length * (ch/cw * 0.7 > 1 ? 1 : cw/ch * 0.7));

            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            line.setAttribute("stroke", color);
            line.setAttribute("class", "energy-line");
            line.setAttribute("marker-end", `url(#marker-head-${a.type})`);
            if (a.isCounter) {
                line.setAttribute("marker-start", `url(#marker-rev-${a.type})`);
            }

            svg.appendChild(line);
        });
    }

    centerArea.appendChild(svg);
}

// --- Task 010c: Flying 4 Energy Lines System ---
function getLocalCoords(el, board) {
    const brect = board.getBoundingClientRect();
    const erect = el.getBoundingClientRect();
    // Map to 366x550 logic space
    return {
        x: (erect.left - brect.left + erect.width / 2) * (366 / brect.width),
        y: (erect.top - brect.top + 7) * (550 / brect.height)
    };
}

function getPalaceCenter(idx) {
    const pNames = ['si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'zi', 'chou', 'yin', 'mao', 'chen'];
    const box = document.getElementById('palace-' + pNames[idx]);
    const board = document.getElementById('main-board');
    if (!box || !board) return { x: 0, y: 0 };
    
    const brect = board.getBoundingClientRect();
    const rect = box.getBoundingClientRect();
    return {
        x: (rect.left - brect.left + rect.width / 2) * (366 / brect.width),
        y: (rect.top - brect.top + rect.height / 2) * (550 / brect.height)
    };
}

function getStarCenter(sName, palaceIdx) {
    const pNames = ['si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'zi', 'chou', 'yin', 'mao', 'chen'];
    const box = document.getElementById('palace-' + pNames[palaceIdx]);
    const board = document.getElementById('main-board');
    if (!box || !board) return null;

    const starGroups = Array.from(box.querySelectorAll('.v-star-group'));
    const targetEl = starGroups.find(el => el.textContent.startsWith(sName));
    if (!targetEl) return null;
    
    return getLocalCoords(targetEl, board);
}

function getDaXianYearMapping(startAge, endAge, birthYear) {
    const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const results = [];
    for (let age = startAge; age <= endAge; age++) {
        const year = birthYear + age - 1;
        // Simple branch calculation: (year - 4) % 12
        let branchIdx = (year - 4) % 12;
        if (branchIdx < 0) branchIdx += 12;
        results.push({ year, age, branchIdx });
    }
    return results;
}

function clearFlyingLines() {
    State.activeFlyingPalaceIdx = null;
    State.activeReceivingStarInfo = null;
    const layer = document.querySelector('.flying-lines-layer');
    if (layer) layer.innerHTML = '';
}

function renderFlyingLines(originIdx) {
    if (originIdx === null) return clearFlyingLines();
    
    const board = document.getElementById('main-board');
    let layer = board.querySelector('.flying-lines-layer');
    if (!layer) {
        layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        layer.setAttribute("class", "flying-lines-layer");
        board.appendChild(layer);
    }
    layer.setAttribute("viewBox", `0 0 366 550`);
    layer.innerHTML = ''; // Fresh start

    // Re-use markers from energy arrows or create new ones
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const COLOR_MAP = { 
        '禄': '#3FB532', // C76 M0 Y100 K0
        '权': '#1F7AFC', // C88 M52 Y1 K0
        '科': '#F5A832', // C1 M36 Y87 K0
        '忌': '#E60012'  // C0 M99 Y100 K0 (Red)
    };
    Object.entries(COLOR_MAP).forEach(([type, color]) => {
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", `f-marker-${type}`);
        marker.setAttribute("markerWidth", "4");
        marker.setAttribute("markerHeight", "4");
        marker.setAttribute("refX", "4");
        marker.setAttribute("refY", "2");
        marker.setAttribute("orient", "auto");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M0,0 L4,2 L0,4 Z");
        path.setAttribute("fill", color);
        marker.appendChild(path);
        defs.appendChild(marker);
    });
    layer.appendChild(defs);

    const record = State.currentActiveRecord;
    const mgStarArray = new Array(12).fill(null).map(() => []); // Need to get actual or just scan DOM
    // For flying lines, we scan DOM anyway to find target palace
    
    const PALACE_ZHIS = ['巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰'];
    const pNames = ['si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'zi', 'chou', 'yin', 'mao', 'chen'];
    const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

    // Get current chart stems start index (Wu Hu Dun)
    const lunar = LunarTools.solar2lunar(parseInt(record.gregYear), parseInt(record.gregMonth), parseInt(record.gregDay));
    const startStemIdx_Yin = ((HEAVENLY_STEMS.indexOf(lunar.gzYear.charAt(0)) % 5) * 2 + 2) % 10;
    
    const bIdx = EARTHLY_BRANCHES.indexOf(PALACE_ZHIS[originIdx]);
    const stem = HEAVENLY_STEMS[(startStemIdx_Yin + (bIdx-2+12)%12)%10];
    const layerRect = layer.getBoundingClientRect();
    const transformations = SIHUA_TABLE[stem];
    const originCenter = getPalaceCenter(originIdx);

    const activePalaceStars = [];
    document.getElementById('palace-' + pNames[originIdx]).querySelectorAll('.v-star-group').forEach(el => {
        activePalaceStars.push({
            name: el.textContent.substring(0,2),
            hasZihua: !!el.querySelector('.zihua-circle')
        });
    });

    for (let sName in transformations) {
        const type = transformations[sName];
        
        // 1. Skip logic for Self-Transformation (自化)
        const selfMatch = activePalaceStars.find(s => s.name === sName);
        if (selfMatch && selfMatch.hasZihua) {
            const zihuaTag = document.getElementById('palace-' + pNames[originIdx]).querySelector('.zihua-circle');
            // Simplified: if star is here and has ANY zihua circle, we check if it matches type
            const starEl = Array.from(document.getElementById('palace-' + pNames[originIdx]).querySelectorAll('.v-star-group')).find(e => e.textContent.startsWith(sName));
            const colorClass = (type === '禄'?'zh-lu':(type === '权'?'zh-quan':(type === '科'?'zh-ke':'zh-ji')));
            if (starEl && starEl.querySelector('.' + colorClass)) continue; 
        }

        // 2. Find target star and palace
        let targetIdx = -1;
        let targetStarPos = null;
        for (let i = 0; i < 12; i++) {
            targetStarPos = getStarCenter(sName, i);
            if (targetStarPos) {
                targetIdx = i;
                break;
            }
        }

        if (targetIdx !== -1) {
            const targetStarPos = getStarCenter(sName, targetIdx);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", originCenter.x);
            line.setAttribute("y1", originCenter.y);
            line.setAttribute("x2", targetStarPos.x); // Point to star head
            line.setAttribute("y2", targetStarPos.y);
            line.setAttribute("stroke", COLOR_MAP[type]);
            line.setAttribute("stroke-width", "2");
            line.setAttribute("class", "flying-line");
            line.setAttribute("marker-end", `url(#f-marker-${type})`);
            layer.appendChild(line);

            // 3. Ji Clashing (Red Dashed)
            if (type === '忌') {
                const oppIdx = (targetIdx + 6) % 12; // Point to opposite of target palace
                const oppCenter = getPalaceCenter(oppIdx);
                const jcLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                jcLine.setAttribute("x1", targetStarPos.x); // Start from the star position
                jcLine.setAttribute("y1", targetStarPos.y);
                jcLine.setAttribute("x2", oppCenter.x);     // End at destination palace center
                jcLine.setAttribute("y2", oppCenter.y);
                jcLine.setAttribute("stroke-width", "2");
                jcLine.setAttribute("stroke", COLOR_MAP['忌']);
                jcLine.setAttribute("class", "ji-chong-line");
                jcLine.setAttribute("marker-end", `url(#f-marker-忌)`);
                layer.appendChild(jcLine);
            }
        }
    }
}

function renderReceivingLines(starName, targetIdx) {
    clearFlyingLines();
    State.activeReceivingStarInfo = { name: starName, palaceIdx: targetIdx };

    const board = document.getElementById('main-board');
    let layer = board.querySelector('.flying-lines-layer');
    if (!layer) {
        layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        layer.setAttribute("class", "flying-lines-layer");
        board.appendChild(layer);
    }
    layer.setAttribute("viewBox", `0 0 366 550`);
    layer.innerHTML = ''; 

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const COLOR_MAP = { 
        '禄': '#3FB532', // C76 M0 Y100 K0
        '权': '#1F7AFC', // C88 M52 Y1 K0
        '科': '#F5A832', // C1 M36 Y87 K0
        '忌': '#E60012'  // C0 M99 Y100 K0
    };
    Object.entries(COLOR_MAP).forEach(([type, color]) => {
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", `f-marker-${type}`);
        marker.setAttribute("markerWidth", "4");
        marker.setAttribute("markerHeight", "4");
        marker.setAttribute("refX", "4");
        marker.setAttribute("refY", "2");
        marker.setAttribute("orient", "auto");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M0,0 L4,2 L0,4 Z");
        path.setAttribute("fill", color);
        marker.appendChild(path);
        defs.appendChild(marker);
    });
    layer.appendChild(defs);

    const record = State.currentActiveRecord;
    const PALACE_ZHIS = ['巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰'];
    const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

    const lunar = LunarTools.solar2lunar(parseInt(record.gregYear), parseInt(record.gregMonth), parseInt(record.gregDay));
    const startStemIdx_Yin = ((HEAVENLY_STEMS.indexOf(lunar.gzYear.charAt(0)) % 5) * 2 + 2) % 10;
    
    const targetPos = getStarCenter(starName, targetIdx);

    for (let i = 0; i < 12; i++) {
        const bIdx = EARTHLY_BRANCHES.indexOf(PALACE_ZHIS[i]);
        const stem = HEAVENLY_STEMS[(startStemIdx_Yin + (bIdx-2+12)%12)%10];
        const transformations = SIHUA_TABLE[stem];
        if (!transformations) continue;

        if (transformations[starName]) {
            const type = transformations[starName];
            const originCenter = getPalaceCenter(i);

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", originCenter.x);
            line.setAttribute("y1", originCenter.y);
            line.setAttribute("x2", targetPos.x);
            line.setAttribute("y2", targetPos.y);
            line.setAttribute("stroke-width", "2");
            line.setAttribute("stroke", COLOR_MAP[type]);
            line.setAttribute("class", "flying-line");
            line.setAttribute("marker-end", `url(#f-marker-${type})`);
            layer.appendChild(line);
        }
    }
}



// --- Rendering Logic ---
// --- Rendering Logic (Task 003: 4-Row Architecture) ---
function renderMainBoard(record) {
    if (!record) return;
    
    // Task 014: Reset temporary selections when switching records
    if (!State.lastRenderedRecordId || State.lastRenderedRecordId !== record.id) {
        State.selectedPalaceIndices.clear();
        State.lastRenderedRecordId = record.id;
    }
    
    let lunar, age;
    try {
        lunar = LunarTools.solar2lunar(parseInt(record.gregYear), parseInt(record.gregMonth), parseInt(record.gregDay));
        age = 2026 - parseInt(record.gregYear) + 1;
    } catch (e) {
        console.error("Lunar conversion error:", e);
        // Fallback to avoid complete blank state
        lunar = null; age = '---';
    }

    const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const PALACES_12 = ["命宫", "兄弟宫", "夫妻宫", "子女宫", "财帛宫", "疾厄宫", "迁移宫", "交友宫", "官禄宫", "田宅宫", "福德宫", "父母宫"];
    const PALACE_ZHIS = ['巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰'];
    const palaces = ['si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'zi', 'chou', 'yin', 'mao', 'chen'];
    const WUXING_MATRIX = [["金四局", "水二局", "火六局", "土五局", "木三局"],["水二局", "火六局", "土五局", "木三局", "金四局"],["火六局", "土五局", "木三局", "金四局", "水二局"]];
    const wuXingJuNumMap = { "水二局": 2, "木三局": 3, "金四局": 4, "土五局": 5, "火六局": 6 };
    
    const tianGan = lunar ? lunar.gzYear.charAt(0) : '甲';
    const birthStemIdx = HEAVENLY_STEMS.indexOf(tianGan);
    const startStemIdx_Yin = ((birthStemIdx % 5) * 2 + 2) % 10;
    
    const isYang = ['甲', '丙', '戊', '庚', '壬'].includes(tianGan);
    const genderStr = record.gender === 'M' ? (isYang ? '阳男' : '阴男') : (isYang ? '阳女' : '阴女');
    if (lunar) State.birthSiHua = SIHUA_TABLE[tianGan] || {};
    const lMonth = lunar ? lunar.lMonth : 1;
    let timeZhiIdx = EARTHLY_BRANCHES.indexOf(record.gregTime);
    if (timeZhiIdx === -1) timeZhiIdx = 0;
    const day = lunar ? lunar.lDay : 1;

    const mingGongZhiIdx = (2 + (lMonth-1) - timeZhiIdx + 12) % 12;
    const mgPalaceArray = new Array(12);
    for (let k = 0; k < 12; k++) mgPalaceArray[(mingGongZhiIdx - k + 12) % 12] = PALACES_12[k];
    State.mgPalaceArray = mgPalaceArray;

    const mgStemIdx = (startStemIdx_Yin + (mingGongZhiIdx-2+12)%12) % 10;
    const wuXingJu = WUXING_MATRIX[Math.floor(mingGongZhiIdx/2)%3][Math.floor(mgStemIdx/2)];
    const juNum = wuXingJuNumMap[wuXingJu] || 2;

    let rem = day % juNum;
    let add = rem === 0 ? 0 : juNum - rem;
    let ziWeiIdx = (2 + Math.floor((day + add) / juNum) - 1) % 12;
    if (add % 2 === 0) ziWeiIdx = (ziWeiIdx + add) % 12; else ziWeiIdx = (ziWeiIdx - add + 12) % 12;
    let tianFuIdx = (16 - ziWeiIdx) % 12;

    const mgStarArray = new Array(12).fill(null).map(() => []);
    
    mgStarArray[(4+timeZhiIdx)%12].push("文曲"); 
    mgStarArray[(10-timeZhiIdx+12)%12].push("文昌");
    mgStarArray[(4+(lMonth-1))%12].push("左辅"); 
    mgStarArray[(10-(lMonth-1)+12)%12].push("右弼");
    [{n:"破军",o:10},{n:"七杀",o:6},{n:"天梁",o:5},{n:"天相",o:4},{n:"巨门",o:3},{n:"贪狼",o:2},{n:"太阴",o:1},{n:"天府",o:0}].forEach(s=>mgStarArray[(tianFuIdx+s.o)%12].push(s.n));
    [{n:"廉贞",o:-8},{n:"天同",o:-5},{n:"武曲",o:-4},{n:"太阳",o:-3},{n:"天机",o:-1},{n:"紫微",o:0}].forEach(s=>mgStarArray[(ziWeiIdx+s.o+12)%12].push(s.n));

    const isForward = (isYang && record.gender === 'M') || (!isYang && record.gender === 'F');
    const daXianArray = new Array(12).fill("");
    for (let i = 0; i < 12; i++) {
        let pIdx = (mingGongZhiIdx + (isForward ? i : -i) + 12) % 12;
        let sAge = juNum + i * 10;
        daXianArray[pIdx] = { range: `${sAge}-${sAge + 9}`, start: sAge, end: sAge + 9 };
    }



    const sanFangIndices = [
        mingGongZhiIdx, 
        (mingGongZhiIdx - 4 + 12) % 12, 
        (mingGongZhiIdx - 8 + 12) % 12
    ];





    palaces.forEach((p, idx) => {
        const box = document.getElementById('palace-' + p);
        if (!box) return;
        const bIdx = EARTHLY_BRANCHES.indexOf(PALACE_ZHIS[idx]);
        
        box.classList.remove('bg-sanfang');
        if (sanFangIndices.includes(bIdx)) box.classList.add('bg-sanfang');
        box.classList.toggle('selected-red', State.selectedPalaceIndices.has(idx));

        const steam = HEAVENLY_STEMS[(startStemIdx_Yin + (bIdx-2+12)%12)%10];
        const pName = mgPalaceArray[bIdx];
        
        const starsHtml = mgStarArray[bIdx].map(s => {
            const colClass = ['太阳', '太阴'].includes(s) ? 'color-sunmoon' : 'color-purple';
            let sihuaTag = '';
            const ySh = SIHUA_TABLE[tianGan][s];
            if (ySh === '禄') sihuaTag = '<span class="sh-lu">禄</span>';
            else if (ySh === '权') sihuaTag = '<span class="sh-quan">权</span>';
            else if (ySh === '科') sihuaTag = '<span class="sh-ke">科</span>';
            else if (ySh === '忌') sihuaTag = '<span class="sh-ji">忌</span>';

            let zihuaTag = '';
            const pSh = SIHUA_TABLE[steam][s];
            if (pSh === '禄') zihuaTag = '<span class="zihua-circle zh-lu"></span>';
            else if (pSh === '权') zihuaTag = '<span class="zihua-circle zh-quan"></span>';
            else if (pSh === '科') zihuaTag = '<span class="zihua-circle zh-ke"></span>';
            else if (pSh === '忌') zihuaTag = '<span class="zihua-circle zh-ji"></span>';

            const isWifiStar = WIFI_STAR_WHITELIST.includes(s);
            const wifiClass = isWifiStar ? 'wifi-trigger' : '';
            return `<div class="v-star-group ${colClass} ${wifiClass}" data-star="${s}" data-p-idx="${idx}">${s}${sihuaTag}${zihuaTag}</div>`;
        }).join('');

        const dxInfo = daXianArray[bIdx];
        const [startAge, endAge] = dxInfo.range.split('-').map(Number);
        const isCurrentDx = (age >= startAge && age <= endAge);
        const hintClass = isCurrentDx ? 'current-dx-hint' : '';
        const ageLabel = age || '';

        box.innerHTML = `
            <div class="p-row-1">${starsHtml}</div>
            <div class="p-row-2">
            </div>
            <div class="p-row-3">
                <span class="stem">${steam}</span>
                <span class="dx-label ${hintClass}">${dxInfo.range}</span>
            </div>
            <div class="p-row-4">
                <span class="branch">${PALACE_ZHIS[idx]}</span>
                <span class="p-name">${pName}</span>
                <div class="right-info" style="right:0; white-space:nowrap;">
                    <span class="age-val" style="display:none">${ageLabel}</span>
                </div>
            </div>
        `;

        // Interaction Listeners (Task 015 moved to delegated handler)

        // interaction logic (Task 014: Long Press Selection)
        // 注意：不可在 mouseleave 时取消，因为自定义光标移动会误触发
        let longPressTimer = null;
        let touchStartX = 0, touchStartY = 0;

        const startPressM = (e) => {
            if (longPressTimer) clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                State.isLongPressSession = true;
                if (State.selectedPalaceIndices.has(idx)) State.selectedPalaceIndices.delete(idx);
                else State.selectedPalaceIndices.add(idx);
                box.classList.toggle('selected-red', State.selectedPalaceIndices.has(idx));
            }, 500);
        };
        const startPressT = (e) => {
            if (longPressTimer) clearTimeout(longPressTimer);
            if (e.touches && e.touches[0]) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
            longPressTimer = setTimeout(() => {
                State.isLongPressSession = true;
                if (State.selectedPalaceIndices.has(idx)) State.selectedPalaceIndices.delete(idx);
                else State.selectedPalaceIndices.add(idx);
                box.classList.toggle('selected-red', State.selectedPalaceIndices.has(idx));
            }, 500);
        };
        const cancelPress = () => { 
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        };
        const cancelPressOnMove = (e) => {
            if (!e.touches || !e.touches[0]) return cancelPress();
            const dx = e.touches[0].clientX - touchStartX;
            const dy = e.touches[0].clientY - touchStartY;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelPress();
        };

        box.onmousedown = startPressM;
        box.ontouchstart = startPressT;
        box.onmouseup = cancelPress;
        box.ontouchend = cancelPress;
        box.onmouseleave = null; // 不在 mouseleave 取消，避免光标移动误触
        box.ontouchmove = cancelPressOnMove;
        box.oncontextmenu = (e) => { if (State.isLongPressSession) e.preventDefault(); };

        box.onclick = (e) => {
            if (State.isLongPressSession) {
                State.isLongPressSession = false; // Reset for next interaction
                return;
            }




            const trigger = e.target.closest('.wifi-trigger');
            if (trigger) {
                e.stopPropagation();
                const sName = trigger.dataset.star;
                const sIdx = parseInt(trigger.dataset.pIdx);
                if (State.activeReceivingStarInfo?.name === sName && State.activeReceivingStarInfo?.palaceIdx === sIdx) clearFlyingLines();
                else renderReceivingLines(sName, sIdx);
                return;
            }

            if (State.activeFlyingPalaceIdx === idx) clearFlyingLines();
            else {
                State.activeFlyingPalaceIdx = idx;
                renderFlyingLines(idx);
            }
        };
    });

    const board = document.getElementById('main-board');
    board.onclick = (e) => {
        if (e.target === board || e.target.classList.contains('center-area')) clearFlyingLines();
    };

    renderEnergyArrows(record, mgStarArray);
    if (State.activeFlyingPalaceIdx !== null) renderFlyingLines(State.activeFlyingPalaceIdx);
    if (State.activeReceivingStarInfo !== null) renderReceivingLines(State.activeReceivingStarInfo.name, State.activeReceivingStarInfo.palaceIdx);

    const zodiacFull = lunar ? `${lunar.animal}（${lunar.gzYear.substring(0,2)}）` : '---';
    if (UI.cName) UI.cName.textContent = record.name;
    if (UI.cGregorian) UI.cGregorian.textContent = `${record.gregYear}年${record.gregMonth}月${record.gregDay}日`;
    const lunarStr = lunar ? `${lunar.gzYear} ${lunar.lMonth}月 ${lunar.lDay}日 ${record.gregTime}时` : (record.lunarStr || '---');
    if (UI.cLunar) UI.cLunar.textContent = lunarStr;
    if (UI.cGender) UI.cGender.textContent = genderStr;
    if (UI.cZodiac) UI.cZodiac.textContent = zodiacFull;
    if (UI.cElements) UI.cElements.textContent = wuXingJu;
    if (UI.cAge) UI.cAge.textContent = age;

    const getStarsInPalaces = (palNames) => {
        let stars = new Set();
        for (let i = 0; i < 12; i++) {
            if (palNames.includes(mgPalaceArray[i])) mgStarArray[i].forEach(s => stars.add(s));
        }
        return stars;
    };
    const mcGuanStars = getStarsInPalaces(["命宫", "财帛宫", "官禄宫"]);
    const mingStars = getStarsInPalaces(["命宫"]);
    const tianZhaiStars = getStarsInPalaces(["田宅宫"]);
    const geJuMatches = [];
    if (["天机", "太阴", "天同", "天梁"].every(s => mcGuanStars.has(s))) geJuMatches.push("机月同梁");
    if (["七杀", "破军", "贪狼"].every(s => mcGuanStars.has(s))) {
        if (["廉贞", "紫微", "武曲"].every(s => mcGuanStars.has(s))) geJuMatches.push("双星杀破狼");
        else geJuMatches.push("杀破狼");
    }
    if (["天府", "天相"].every(s => mcGuanStars.has(s)) && !["廉贞", "紫微", "武曲"].some(s => mcGuanStars.has(s))) geJuMatches.push("府相");
    if (["左辅", "右弼"].every(s => mcGuanStars.has(s))) geJuMatches.push("辅弼供主");
    if (["文昌", "文曲"].every(s => mcGuanStars.has(s))) geJuMatches.push("文桂文华");
    const majorStars = ["紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"];
    if (!majorStars.some(s => mingStars.has(s))) geJuMatches.push("命无正曜");
    const mIdx = mgPalaceArray.indexOf("命宫");
    if (mIdx === 4 || mIdx === 10) { 
        if (mgStarArray[4].includes("太阴") && mgStarArray[10].includes("太阳")) geJuMatches.push("日月反背");
    }
    if (["太阳", "太阴"].every(s => tianZhaiStars.has(s))) geJuMatches.push("日月照壁");

    const geJuResult = geJuMatches.length > 0 ? geJuMatches.join(" ") : "(-)";
    if (UI.cFormation) UI.cFormation.textContent = geJuResult;

    const centerArea = document.querySelector('.center-area');
    if (centerArea) {
        if (!centerArea.querySelector('.brand-signature')) {
            const logoSrc = typeof LOGO_BASE64 !== 'undefined' ? LOGO_BASE64 : 'img/5cm W .png';
            centerArea.insertAdjacentHTML('beforeend', `<img src="${logoSrc}" class="brand-signature" alt="Brand Logo">`);
        }
    }
    if (UI.infoListMobile) {
        UI.infoListMobile.className = 'info-grid-2-col';
        UI.infoListMobile.innerHTML = `
            <div class="info-item"><b>姓名:</b> ${record.name}</div>
            <div class="info-item"><b>生肖:</b> ${zodiacFull}</div>
            <div class="info-item"><b>西历:</b> ${record.gregYear}年${record.gregMonth}月${record.gregDay}日</div>
            <div class="info-item"><b>五行:</b> ${wuXingJu}</div>
            <div class="info-item"><b>农历:</b> ${lunarStr}</div>
            <div class="info-item"><b>虚岁:</b> ${age}</div>
            <div class="info-item"><b>性别:</b> ${genderStr}</div>
            <div class="info-item"><b>格局:</b> ${geJuResult}</div>
        `;
    }
}



// --- Navigation & Global Actions ---
UI.navItems.forEach(item => item.addEventListener('click', () => item.dataset.view && switchView(item.dataset.view)));

UI.btnSaveChart.addEventListener('click', () => {
    let targetId = State.lastUsedGroupId || State.defaultGroupId;
    if (!targetId && State.groups.length > 0) targetId = State.groups[0].id;
    if (!targetId) return alert("请先在资料页设置一个群组");

    const r = { 
        id: 'r_' + Date.now(), 
        groupId: targetId, 
        name: UI.userName.value, 
        gender: document.querySelector('input[name="gender"]:checked').value, 
        gregYear: UI.gregYear.value, 
        gregMonth: UI.gregMonth.value, 
        gregDay: UI.gregDay.value, 
        gregTime: UI.gregTime.value, 
        lunarStr: UI.lunarDisplay.querySelector('.lunar-date-line')?.textContent || UI.lunarDisplay.textContent 
    };
    
    State.records.push(r); 
    State.currentActiveRecord = r; 
    State.lastUsedGroupId = targetId; // Remember for next time
    saveState(); 
    renderGroups(); 
    renderMainBoard(r); 
    switchView('view-main');
});

// --- Snapshot & Capture Logic ---
function getSnapshotFilename(record) {
    if (!record) return `ZiWi_${Date.now()}`;
    
    const now = new Date();
    const dateStr = now.getFullYear() + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                    now.getMinutes().toString().padStart(2, '0');
    
    const birthStr = record.gregYear + 
                     record.gregMonth.toString().padStart(2, '0') + 
                     record.gregDay.toString().padStart(2, '0');
    
    const gender = record.gender === 'M' ? '男' : '女';
    const zhi = record.gregTime || ''; // The Zhi period
    
    return `${dateStr} ${timeStr} ${record.name}${gender}${birthStr}${zhi}时`;
}

function performSnapshot() {
    if (typeof html2canvas === 'undefined') {
        return alert("截图系统由于插件未加载失败。请确保网络连接正常以加载截图组件，或检查 index.html 中的脚本引入。");
    }

    if (!State.currentActiveRecord) {
        return alert("请先选择一个紫微命盘资料。");
    }

    // Play Shutter Sound
    const audio = new Audio(SHUTTER_SOUND_URL);
    audio.play().catch(e => console.warn("Audio play blocked by browser:", e));

    // Trigger Flash Effect
    const flashEl = document.getElementById('camera-flash');
    if (flashEl) {
        flashEl.classList.remove('active');
        void flashEl.offsetWidth; // Force reflow
        flashEl.classList.add('active');
    }
    
    // Auto-switch to Main view if not active, as hidden elements cannot be captured
    if (!document.getElementById('view-main').classList.contains('active')) {
        switchView('view-main');
    }

    const target = document.getElementById('main-board');
    if (!target) return alert("无法找到命盘目标 (#main-board)");
    
    const filename = getSnapshotFilename(State.currentActiveRecord) + ".jpg";
    
    // Preparation
    UI.phoneContainer.classList.add('capturing');
    console.log("Starting snapshot capture for:", filename);
    
    html2canvas(target, { 
        scale: 2,
        useCORS: true,        // Try to use CORS for local images
        allowTaint: false,    // Absolutely NO taint, or toDataURL will fail
        backgroundColor: "#ffffff",
        logging: true,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
            // CRITICAL FIX FOR TAINTS: 
            // 1. Remove ANY external font links that might taint the canvas
            const links = clonedDoc.getElementsByTagName('link');
            for (let i = links.length - 1; i >= 0; i--) {
                if (links[i].href.includes('fonts.googleapis.com')) {
                    links[i].parentNode.removeChild(links[i]);
                }
            }

            // 2. Force system fonts to ensure clean capture
            const clonedBoard = clonedDoc.getElementById('main-board');
            if (clonedBoard) {
                clonedBoard.style.fontFamily = "'Microsoft YaHei', 'SimHei', sans-serif";
                const allElements = clonedBoard.getElementsByTagName('*');
                for (let i = 0; i < allElements.length; i++) {
                    allElements[i].style.fontFamily = "'Microsoft YaHei', 'SimHei', sans-serif";
                }
            }
        }
    }).then(canvas => {
        try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            UI.phoneContainer.classList.remove('capturing');
            console.log("Snapshot successful");
        } catch (exportErr) {
            console.error("Canvas export failed:", exportErr);
            alert("截图保存失败：由于浏览器安全限制，无法导出图片。请尝试打开网络或在服务器环境运行。");
            UI.phoneContainer.classList.remove('capturing');
        }
    }).catch(err => {
        console.error("html2canvas error:", err);
        alert("截图过程中出现错误: " + err.message);
        UI.phoneContainer.classList.remove('capturing');
    });
}

if (UI.snapshotBtn) UI.snapshotBtn.addEventListener('click', performSnapshot);



// --- Import Logic (Task 024) ---
UI.importBtn.addEventListener('click', () => UI.importFileInput.click());
UI.importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => parseImportedText(event.target.result);
    reader.readAsText(file);
});

function parseImportedText(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
    
    // Ensure "默认群组" exists
    let defaultGroup = State.groups.find(g => g.name === '默认群组' || g.id === 'default');
    if (!defaultGroup) {
        defaultGroup = { id: 'default', name: '默认群组' };
        State.groups.push(defaultGroup);
    }
    
    let currentGroupId = State.lastUsedGroupId || defaultGroup.id;
    let importCount = 0;
    const dateRegex = /(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日\s*([子丑寅卯辰巳午未申酉戌亥天])?时?/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Check for Member Record Start
        let name, gender, dateLine;
        let skipLines = 0;

        // Case A: Name (Gender) format, e.g., "老李 (男)"
        const nameGenderMatch = line.match(/^(.+?)\s*[（(]([男女MF])[）)]$/);
        if (nameGenderMatch) {
            name = nameGenderMatch[1].trim();
            gender = nameGenderMatch[2];
            dateLine = lines[i+1];
            if (dateLine && dateRegex.test(dateLine)) {
                skipLines = 1;
            } else {
                name = null; // False alarm
            }
        } 
        // Case B: Name followed by Gender line
        else if (lines[i+1] && (['男','女','M','F'].includes(lines[i+1]))) {
            name = line;
            gender = lines[i+1];
            dateLine = lines[i+2];
            if (dateLine && dateRegex.test(dateLine)) {
                skipLines = 2;
            } else {
                name = null;
            }
        }
        // Case C: Name followed directly by Date line (Gender default to M)
        else if (lines[i+1] && dateRegex.test(lines[i+1])) {
            name = line;
            gender = '男';
            dateLine = lines[i+1];
            skipLines = 1;
        }
        // Case D: Legacy labeled format "姓名: xxx"
        else if (line.startsWith('姓名:')) {
            name = line.replace('姓名:', '').trim();
            gender = (lines[i+1] || '').replace('性别:', '').trim();
            dateLine = (lines[i+2] || '').replace('填西历:', '').trim();
            if (dateLine && dateRegex.test(dateLine)) {
                skipLines = 2;
            } else {
                name = null;
            }
        }

        // If a member record was identified
        if (name && dateLine) {
            const dateMatch = dateLine.match(dateRegex);
            if (dateMatch) {
                const r = {
                    id: 'r_' + Date.now() + Math.random(),
                    groupId: String(currentGroupId),
                    name: name,
                    gender: (gender.includes('男') || gender.includes('M')) ? 'M' : 'F',
                    gregYear: dateMatch[1],
                    gregMonth: dateMatch[2],
                    gregDay: dateMatch[3],
                    gregTime: dateMatch[4] || '子',
                    lunarStr: ''
                };
                
                try {
                    const lObj = LunarTools.solar2lunar(parseInt(r.gregYear), parseInt(r.gregMonth), parseInt(r.gregDay));
                    r.lunarStr = `${lObj.gzYear} ${lObj.lMonth}月 ${lObj.lDay}日 ${r.gregTime}时`;
                } catch(e) {}

                State.records.push(r);
                importCount++;
                i += skipLines;
                continue;
            }
        }

        // 2. If not a member record, check if it's a Group Header
        // Strip redundant prefixes: "群组", "Folder", "Group", "名称", "文件夹", "群组名"
        // Uses a repeating pattern to handle combinations like "Folder Group 名称 Ipoh"
        const cleanGroupName = line.replace(/^((群组|Folder|Group|名称|文件夹|群组名)[:：\s]*)+/gi, '').trim();
        
        // Filter out dates or genders accidentally identified as groups
        if (cleanGroupName && !dateRegex.test(line) && !['男','女','M','F'].includes(line)) {
            let group = State.groups.find(g => g.name === cleanGroupName);
            if (!group) {
                group = { id: 'g_user_' + Date.now() + Math.random(), name: cleanGroupName };
                State.groups.push(group);
            }
            currentGroupId = group.id;
            State.lastUsedGroupId = group.id; // Auto-focus on this group
        }
    }

    if (importCount > 0) {
        saveState();
        renderGroups();
        setTimeout(() => {
            alert(`成功导入 ${importCount} 条命盘数据！\n数据已存入对应的文件夹中。`);
        }, 100);
    } else {
        alert("未发现有效的数据格式，请检查文档内容。");
    }
    UI.importFileInput.value = ''; // Reset
}

UI.btnNewChart.addEventListener('click', resetToToday);





// --- Background System ---
function initBackgroundSystem() {
    const applyBg = (src) => {
        if (!src) {
            UI.bgLayer.style.backgroundImage = 'none';
            UI.bgLayer.style.backgroundColor = '#8e8ebb'; 
        } else {
            UI.bgLayer.style.backgroundImage = `url("${src}")`;
            UI.bgLayer.style.backgroundColor = 'transparent';
        }
    };

    const savedBg = localStorage.getItem('ziwi_bg_image');
    if (savedBg) applyBg(savedBg);

    if (UI.bgChangeBtn) {
        UI.bgChangeBtn.onclick = (e) => {
            e.preventDefault();
            UI.bgUploadInput.click();
        };
    }

    if (UI.bgUploadInput) {
        UI.bgUploadInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_DIM = 1080; 
                    let width = img.width, height = img.height;
                    if (width > height) { if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; } }
                    else { if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    try {
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                        localStorage.setItem('ziwi_bg_image', compressedDataUrl);
                        applyBg(compressedDataUrl);
                    } catch (err) { alert("存档空间不足。"); }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };
    }
}

// --- Context Menu & Management ---
let contextTarget = { type: null, id: null };



/**
 * Task 015: Helper to get selected Da Xian palace name
 */


function setupLongPress(el, callback) {
    let timer;
    const start = (e) => { timer = setTimeout(() => { e.preventDefault(); callback(e); }, 600); };
    const end = () => clearTimeout(timer);
    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
    el.addEventListener('touchend', end);
}

function showContextMenu(e, type, id) {
    e.preventDefault();
    contextTarget = { type, id };
    const menu = document.getElementById('context-menu');
    menu.style.display = 'block';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
}

document.addEventListener('click', () => {
    document.getElementById('context-menu').style.display = 'none';
});

document.getElementById('menu-rename').addEventListener('click', () => {
    const { type, id } = contextTarget;
    const newName = prompt("请输入新名称:");
    if (!newName) return;
    
    if (type === 'group') {
        const group = State.groups.find(g => g.id === id);
        if (group) group.name = newName;
    } else {
        const record = State.records.find(r => r.id === id);
        if (record) record.name = newName;
    }
    saveState(); renderGroups();
});

document.getElementById('menu-delete').addEventListener('click', () => {
    const { type, id } = contextTarget;
    if (!confirm("确定删除吗？数据不可恢复。")) return;
    
    if (type === 'group') {
        State.groups = State.groups.filter(g => g.id !== id);
        State.records = State.records.filter(r => r.groupId !== id);
    } else {
        State.records = State.records.filter(r => r.id !== id);
    }
    saveState(); renderGroups();
});

// --- Startup ---
initDropdowns(); checkAuth(); renderGroups(); resetToToday(); initBackgroundSystem();



// 空盘启动：每次进入不自动加载记录，保持空盘状态

// --- Custom Touch Cursor Logic (Task: Mobile Simulation) ---
const cursor = document.getElementById('custom-cursor');
if (cursor) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    document.addEventListener('mousedown', () => cursor.classList.add('pressing'));
    document.addEventListener('mouseup', () => cursor.classList.remove('pressing'));
}
