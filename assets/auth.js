const SUPABASE_URL = "https://vkwbzlnnmnblfpbsuvtz.supabase.co";
const SUPABASE_KEY = "sb_publishable_GbasoWtwqxpZt_lcs6GxjQ_I3hohy36";

window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {
  injectAuthUI();

  setTimeout(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      openModal();   // ✅ force open after DOM ready
    } else {
      applyUser(user);
    }
  }, 100); // small delay ensures DOM exists
});

// 🧩 UI INJECTION
function injectAuthUI() {
  const modal = document.createElement("div");
  modal.id = "authModal";
  modal.className = "modal hidden";

  modal.innerHTML = `
    <div class="modal-box">
      <h3 id="authTitle">Login</h3>

      <input id="authName" placeholder="Name" />
      <input id="authPassword" type="password" placeholder="Password" />
      <input id="authPhone" placeholder="Phone (signup only)" class="hidden" />

      <div id="authError" class="error"></div>

      <button id="authBtn">Login</button>
      <p id="authToggle" class="toggle">Create new account</p>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("authBtn").onclick = handleAuth;
  document.getElementById("authToggle").onclick = toggleMode;
}


// 🔄 MODE
let isSignup = false;

function toggleMode() {
  isSignup = !isSignup;

  document.getElementById("authTitle").innerText = isSignup ? "Sign Up" : "Login";
  document.getElementById("authBtn").innerText = isSignup ? "Create Account" : "Login";
  document.getElementById("authPhone").classList.toggle("hidden");

  document.getElementById("authToggle").innerText =
    isSignup ? "Already have an account?" : "Create new account";

  clearError();
}


// 🔐 AUTH LOGIC
async function handleAuth() {
  const name = document.getElementById("authName").value.trim();
  const password = document.getElementById("authPassword").value.trim();
  const phone = document.getElementById("authPhone").value.trim();

  if (!name || !password || (isSignup && !phone)) {
    return showError("Fill all fields");
  }

  if (isSignup) {
    const { data, error } = await window.db
      .from("users")
      .insert([{ name, password, phone }])
      .select()
      .single();

    if (error) return showError("User exists or error");

    saveUser(data);

  } else {
    const { data, error } = await window.db
      .from("users")
      .select("*")
      .eq("name", name)
      .eq("password", password)
      .single();

    if (error || !data) return showError("Wrong credentials");

    saveUser(data);
  }
}


// 💾 SAVE USER
function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
  closeModal();
  applyUser(user);
}


// 🎯 APPLY USER
function applyUser(user) {
  const nameEl = document.querySelector(".name");
  const phoneEl = document.querySelector(".phone");

  if (nameEl) nameEl.innerText = user.name;
  if (phoneEl) phoneEl.innerText = user.phone;
}


// 🎨 MODAL CONTROL
function openModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex"; // 🔥 force visible
  }
}

function closeModal() {
  document.getElementById("authModal").classList.add("hidden");
}


// ⚠️ ERROR
function showError(msg) {
  document.getElementById("authError").innerText = msg;
}

function clearError() {
  document.getElementById("authError").innerText = "";
}