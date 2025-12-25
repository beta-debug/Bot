// hooking DOM
const root = document.getElementById("root");
const topbarRight = document.getElementById("topbarRight");

const STORAGE_USERS = "pwa_users_v1";
const STORAGE_SESSION = "pwa_session_v1";
const STORAGE_BASEURL = "pwa_baseurl_v1";

const ROOMS = [
  { id: 1, name: "Baccarat Room 1" },
  { id: 2, name: "Baccarat Room 2" },
  { id: 3, name: "Baccarat Room 3" },
  { id: 4, name: "Baccarat Room 4" },
];

function getUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_USERS) || "{}"); }
  catch { return {}; }
}
function setUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_SESSION) || "null"); }
  catch { return null; }
}
function setSession(sess) {
  if (!sess) sessionStorage.removeItem(STORAGE_SESSION);
  else sessionStorage.setItem(STORAGE_SESSION, JSON.stringify(sess));
}

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function setTopbar() {
  const sess = getSession();
  if (!sess) {
    topbarRight.innerHTML = "";
    return;
  }
  topbarRight.innerHTML = `
    <span class="badge">${escapeHtml(sess.username)}</span>
    <button class="btnGhost" id="logoutBtn">Logout</button>
  `;
  document.getElementById("logoutBtn").onclick = () => {
    setSession(null);
    renderLogin();
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function renderLogin(prefillUser = "") {
  setTopbar();
  root.innerHTML = `
    <div class="card">
      <h1>เข้าสู่ระบบ</h1>
      <p>ใส่ User / Password เพื่อเข้าใช้งาน</p>

      <div class="field">
        <label>User</label>
        <input id="loginUser" placeholder="เช่น gavin" value="${escapeHtml(prefillUser)}" autocomplete="username" />
      </div>

      <div class="field">
        <label>Password</label>
        <input id="loginPass" type="password" placeholder="••••••••" autocomplete="current-password" />
      </div>

      <div class="actions">
        <button class="btn" id="loginBtn">Login</button>
        <button class="btnGhost" id="goSignupBtn">สมัครสมาชิก</button>
      </div>

      <p class="small" id="loginMsg"></p>

      <hr style="border:0;border-top:1px solid var(--line); margin:16px 0;" />

      <p class="small">
        📌 หมายเหตุ: นี่เป็นตัวอย่าง (เก็บข้อมูลในเครื่องด้วย localStorage) ใช้งานจริงควรมี Backend + Database
      </p>
    </div>
  `;

  document.getElementById("goSignupBtn").onclick = () => renderSignup();
  document.getElementById("loginBtn").onclick = async () => {
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value;

    const msg = document.getElementById("loginMsg");
    msg.textContent = "";

    if (!u || !p) {
      msg.textContent = "กรุณากรอก User และ Password ให้ครบ";
      return;
    }

    const users = getUsers();
    if (!users[u]) {
      msg.textContent = "ไม่พบผู้ใช้นี้ กรุณาสมัครสมาชิกก่อน";
      return;
    }

    const hash = await sha256(p);
    if (users[u].passHash !== hash) {
      msg.textContent = "Password ไม่ถูกต้อง";
      return;
    }

    setSession({ username: u });
    renderLobby();
  };
}

function renderSignup() {
  setTopbar();
  root.innerHTML = `
    <div class="card">
      <h1>สมัครสมาชิก</h1>
      <p>กรอกข้อมูลเพื่อสร้างบัญชี</p>

      <div class="field">
        <label>User ที่ต้องการ</label>
        <input id="suUser" placeholder="เช่น gavin" autocomplete="username" />
      </div>

      <div class="field">
        <label>ตั้ง Password</label>
        <input id="suPass" type="password" placeholder="••••••••" autocomplete="new-password" />
      </div>

      <div class="field">
        <label>เบอร์โทร</label>
        <input id="suPhone" placeholder="เช่น 0812345678" inputmode="numeric" />
      </div>

      <div class="actions">
        <button class="btn2" id="saveBtn">บันทึก</button>
        <button class="btnGhost" id="backBtn">กลับไปหน้า Login</button>
      </div>

      <p class="small" id="suMsg"></p>
    </div>
  `;

  document.getElementById("backBtn").onclick = () => renderLogin();
  document.getElementById("saveBtn").onclick = async () => {
    const u = document.getElementById("suUser").value.trim();
    const p = document.getElementById("suPass").value;
    const phone = document.getElementById("suPhone").value.trim();

    const msg = document.getElementById("suMsg");
    msg.textContent = "";

    if (!u || !p || !phone) {
      msg.textContent = "กรุณากรอก User / Password / เบอร์โทร ให้ครบ";
      return;
    }

    // เช็คเบอร์แบบง่ายๆ
    const phoneOk = /^[0-9+\-\s]{8,20}$/.test(phone);
    if (!phoneOk) {
      msg.textContent = "รูปแบบเบอร์โทรไม่ถูกต้อง";
      return;
    }

    const users = getUsers();
    if (users[u]) {
      msg.textContent = "User นี้ถูกใช้แล้ว กรุณาเปลี่ยน";
      return;
    }

    const passHash = await sha256(p);
    users[u] = { passHash, phone, createdAt: new Date().toISOString() };
    setUsers(users);

    // กลับไปหน้า Login และกรอก user ให้เลย
    renderLogin(u);
  };
}

function renderLobby() {
  const sess = getSession();
  if (!sess) return renderLogin();

  setTopbar();

  const baseUrl = (localStorage.getItem(STORAGE_BASEURL) || "").trim();

  root.innerHTML = `
    <div class="card">
      <h1>เลือกห้อง</h1>
      <p>ตั้งค่าโดเมน/ลิงก์ห้องไว้ก่อน (ยังไม่มีตอนนี้ก็เว้นได้)</p>

      <div class="field">
        <label>Base URL (ใส่โดเมนตอนมี เช่น https://yourdomain.com)</label>
        <input id="baseUrl" placeholder="เช่น https://example.com" value="${escapeHtml(baseUrl)}" />
        <p class="small">ระบบจะเปิดเป็น: Base URL + /room?id=เลขห้อง</p>
      </div>

      <div class="actions">
        <button class="btn" id="saveBaseBtn">บันทึกโดเมน</button>
        <button class="btnGhost" id="clearBaseBtn">ล้างโดเมน</button>
      </div>

      <div class="list" id="roomList"></div>

      <p class="small" id="lobbyMsg"></p>
    </div>
  `;

  document.getElementById("saveBaseBtn").onclick = () => {
    const v = document.getElementById("baseUrl").value.trim();
    localStorage.setItem(STORAGE_BASEURL, v);
    renderLobby();
  };
  document.getElementById("clearBaseBtn").onclick = () => {
    localStorage.removeItem(STORAGE_BASEURL);
    renderLobby();
  };

  const list = document.getElementById("roomList");
  list.innerHTML = ROOMS.map(r => {
    const url = makeRoomUrl(r.id);
    return `
      <div class="room">
        <div class="meta">
          <div class="name">${escapeHtml(r.name)}</div>
          <div class="small">${escapeHtml(url)}</div>
        </div>
        <button class="btn2" data-room="${r.id}">เข้า</button>
      </div>
    `;
  }).join("");

  list.querySelectorAll("button[data-room]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = Number(e.currentTarget.getAttribute("data-room"));
      openRoom(id);
    });
  });
}

function makeRoomUrl(roomId) {
  const base = (localStorage.getItem(STORAGE_BASEURL) || "").trim();
  if (!base) return "ยังไม่ได้ตั้งค่าโดเมน (จะเปิด https://example.com ชั่วคราว)";
  return `${base.replace(/\/+$/, "")}/room?id=${encodeURIComponent(roomId)}`;
}

function openRoom(roomId) {
  const msg = document.getElementById("lobbyMsg");
  const base = (localStorage.getItem(STORAGE_BASEURL) || "").trim();
  const url = base ? makeRoomUrl(roomId) : "https://example.com";

  // เปิดแบบ “หน้าต่างเล็ก” (บนมือถือบางทีจะกลายเป็นแท็บใหม่)
  const features = [
    "popup=yes",
    "width=420",
    "height=720",
    "left=50",
    "top=50",
    "noopener=yes",
    "noreferrer=yes"
  ].join(",");

  const w = window.open(url, `room_${roomId}`, features);

  if (!w) {
    msg.textContent = "เบราว์เซอร์บล็อก popup — ให้อนุญาต popups หรือกดค้างเปิดแท็บใหม่";
    return;
  }

  msg.textContent = `กำลังเปิดห้อง ${roomId}...`;
}

// start
(function init() {
  const sess = getSession();
  if (sess?.username) renderLobby();
  else renderLogin();
})();
