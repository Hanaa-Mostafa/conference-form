// ================================================
// ⚙️ إعدادات
// ================================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwC88X0Hh6mdtuQIURq2ePhv2SMJJAnFTm10ESCI6AIy45NQx-QBCT2UykTy2y6zCcPIA/exec";
let ADMIN_USER = null;
let ADMIN_PASS = null;
let allRows = [];
let allHeaders = [];

// الأعمدة اللي هتظهر في الجدول (بالترتيب)
const VISIBLE_COLS = [
  "رقم مرجعي", "تاريخ التسجيل", "الاسم العربي", "الدرجة العلمية",
  "جهة العمل", "الدولة والمدينة", "البريد الإلكتروني", "رقم الهاتف",
  "طبيعة الحضور", "نوع المشاركة", "عنوان البحث عربي", "شهادة مشاركة"
];

// ================================================
// لوجن
// ================================================
// تحميل الإعدادات عند فتح الصفحة
function loadSettings() {
  const cbName = 'cbSettings_' + Date.now();
  window[cbName] = function(json) {
    delete window[cbName];
    const s = document.getElementById('settingsScript');
    if (s) s.remove();

    if (json.status === 'success' && json.settings) {
      ADMIN_USER = String(json.settings['admin_user'] || 'admin').trim();
      ADMIN_PASS = String(json.settings['admin_pass'] || '1234').trim();
    } else {
      ADMIN_USER = 'admin';
      ADMIN_PASS = '1234';
    }
  };
  const script = document.createElement('script');
  script.id = 'settingsScript';
  script.src = APPS_SCRIPT_URL + '?action=getSettings&callback=' + cbName;
  script.onerror = function() {
    ADMIN_USER = 'admin';
    ADMIN_PASS = '1234';
  };
  document.body.appendChild(script);
}

function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  if (!user || !pass) return;

  // لو الإعدادات لسه مش اتحملت استخدم الافتراضي
  const checkUser = ADMIN_USER || 'admin';
  const checkPass = ADMIN_PASS || '1234';

  if (user === checkUser && pass === checkPass) {
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminPage').style.display = 'block';
    loadData();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}

function doLogout() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('adminPage').style.display = 'none';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

// ================================================
// جلب البيانات من Google Sheets
// ================================================
async function loadData() {
  document.getElementById('tableContent').innerHTML = `
    <div class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>جارٍ تحميل البيانات...</p>
    </div>`;

  // إزالة السكريبت القديم لو موجود
  const oldScript = document.getElementById('jsonpScript');
  if (oldScript) oldScript.remove();

  const cbName = 'cb_' + Date.now();

  window[cbName] = function(json) {
    delete window[cbName];
    const s = document.getElementById('jsonpScript');
    if (s) s.remove();

    if (json.status !== 'success') {
      document.getElementById('tableContent').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle" style="color:#c62828;"></i>
          <p style="color:#c62828;">خطأ: ${json.message || 'غير معروف'}</p>
          <button class="btn-refresh" onclick="loadData()" style="margin-top:10px;">إعادة المحاولة</button>
        </div>`;
      return;
    }

    allHeaders = json.headers;
    allRows = json.rows;
    updateStats();
    renderTable(allRows);
  };

  const script = document.createElement('script');
  script.id = 'jsonpScript';
  script.src = APPS_SCRIPT_URL + '?action=getData&callback=' + cbName;
  script.onerror = function() {
    document.getElementById('tableContent').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle" style="color:#c62828;"></i>
        <p style="color:#c62828;">تعذّر الاتصال. تأكد من إعدادات الـ Deployment.</p>
        <button class="btn-refresh" onclick="loadData()" style="margin-top:10px;">إعادة المحاولة</button>
      </div>`;
  };
  document.body.appendChild(script);
}

// ================================================
// إحصائيات
// ================================================
function updateStats() {
  const typeIdx = allHeaders.indexOf("نوع المشاركة");
  const attendIdx = allHeaders.indexOf("طبيعة الحضور");

  const total = allRows.length;
  const research = allRows.filter(r => r[typeIdx] === "ورقة بحثية").length;
  const physical = allRows.filter(r => (r[attendIdx] || '').includes("فعلي")).length;
  const online = allRows.filter(r => (r[attendIdx] || '').includes("أون لاين") || (r[attendIdx] || '').toLowerCase().includes("online")).length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statResearch').textContent = research;
  document.getElementById('statPhysical').textContent = physical;
  document.getElementById('statOnline').textContent = online;
}

// ================================================
// رسم الجدول
// ================================================
function renderTable(rows) {
  if (!rows || rows.length === 0) {
    document.getElementById('tableContent').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>لا توجد تسجيلات حتى الآن</p>
      </div>`;
    return;
  }

  // حساب فهرس كل عمود مطلوب
  const colIndexes = VISIBLE_COLS.map(col => allHeaders.indexOf(col));

  const thead = `
    <thead>
      <tr>
        <th>#</th>
        ${VISIBLE_COLS.map(col => `<th>${col}</th>`).join('')}
      </tr>
    </thead>`;

  const tbody = `
    <tbody>
      ${rows.map((row, i) => `
        <tr>
          <td style="color:#8a9aa8; font-size:0.8rem;">${i + 1}</td>
          ${colIndexes.map((idx, ci) => {
            const val = idx >= 0 ? (row[idx] || '-') : '-';
            const colName = VISIBLE_COLS[ci];

            if (colName === "رقم مرجعي") {
              return `<td><span class="ref-badge">${val}</span></td>`;
            }
            if (colName === "نوع المشاركة") {
              const cls = val === "ورقة بحثية" ? "type-research" : "type-listener";
              return `<td><span class="type-badge ${cls}">${val}</span></td>`;
            }
            if (colName === "طبيعة الحضور") {
              const cls = val.includes("فعلي") ? "attend-physical" : "attend-online";
              return `<td><span class="attend-badge ${cls}">${val}</span></td>`;
            }
            if (colName === "البريد الإلكتروني") {
              return `<td><a href="mailto:${val}" style="color:#002d62; text-decoration:none;">${val}</a></td>`;
            }
            if (colName === "رقم الهاتف") {
              return `<td dir="ltr" style="text-align:right;">${val}</td>`;
            }
            return `<td>${val}</td>`;
          }).join('')}
        </tr>`).join('')}
    </tbody>`;

  document.getElementById('tableContent').innerHTML = `
    <div style="overflow-x:auto;">
      <table>${thead}${tbody}</table>
    </div>
    <div class="record-count">
      <i class="fas fa-list"></i> إجمالي السجلات المعروضة: <strong>${rows.length}</strong>
    </div>`;
}

// ================================================
// بحث وفلترة
// ================================================
function filterTable() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const typeFilter = document.getElementById('filterType').value;
  const attendFilter = document.getElementById('filterAttend').value;

  const typeIdx = allHeaders.indexOf("نوع المشاركة");
  const attendIdx = allHeaders.indexOf("طبيعة الحضور");
  const nameIdx = allHeaders.indexOf("الاسم العربي");
  const emailIdx = allHeaders.indexOf("البريد الإلكتروني");
  const instIdx = allHeaders.indexOf("جهة العمل");

  const filtered = allRows.filter(row => {
    const matchSearch = !search ||
      (row[nameIdx] || '').toLowerCase().includes(search) ||
      (row[emailIdx] || '').toLowerCase().includes(search) ||
      (row[instIdx] || '').toLowerCase().includes(search);

    const matchType = !typeFilter || (row[typeIdx] || '') === typeFilter;
    const matchAttend = !attendFilter || (row[attendIdx] || '').includes(attendFilter);

    return matchSearch && matchType && matchAttend;
  });

  renderTable(filtered);
}

// ================================================
// تصدير CSV
// ================================================
function exportCSV() {
  if (!allRows.length) return alert("لا توجد بيانات للتصدير");

  const BOM = "\uFEFF";
  const header = allHeaders.join(",");
  const csvRows = allRows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );
  const csv = BOM + [header, ...csvRows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `تسجيلات_المؤتمر_${new Date().toLocaleDateString('ar-EG')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// تشغيل تحميل الإعدادات
loadSettings();
