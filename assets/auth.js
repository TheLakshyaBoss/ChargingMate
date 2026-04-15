const SUPABASE_URL = "https://vkwbzlnnmnblfpbsuvtz.supabase.co";
const SUPABASE_KEY = "sb_publishable_GbasoWtwqxpZt_lcs6GxjQ_I3hohy36";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔥 INJECT MODAL
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.createElement("div");
  modal.id = "loginModal";
  modal.className = "modal hidden";

  modal.innerHTML = `
    <div class="modal-box">
      <h3 id="authTitle">Login</h3>

      <input id="userName" placeholder="Name" />
      <input id="userPassword" type="password" placeholder="Password" />
      <input id="userPhone" placeholder="Phone (signup only)" class="hidden" />

      <div id="authError" class="error"></div>

      <button id="authBtn">Login</button>
      <p id="toggleAuth" class="toggle">Create new account</p>
    </div>
  `;

  document.body.appendChild(modal);

  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    modal.classList.remove("hidden");
  } else {
    applyUser(user);
  }

  document.getElementById("authBtn").onclick = handleAuth;
  document.getElementById("toggleAuth").onclick = toggleMode;
});


// 🔄 MODE SWITCH
let isSignup = false;

function toggleMode() {
  isSignup = !isSignup;

  document.getElementById("authTitle").innerText = isSignup ? "Sign Up" : "Login";
  document.getElementById("authBtn").innerText = isSignup ? "Create Account" : "Login";
  document.getElementById("userPhone").classList.toggle("hidden");

  document.getElementById("toggleAuth").innerText = isSignup
    ? "Already have an account?"
    : "Create new account";

  clearError();
}


// 🔐 AUTH HANDLER
async function handleAuth() {
  const name = document.getElementById("userName").value.trim();
  const password = document.getElementById("userPassword").value.trim();
  const phone = document.getElementById("userPhone").value.trim();

  if (!name || !password || (isSignup && !phone)) {
    showError("Fill all required fields");
    return;
  }

  if (isSignup) {
    // 🔥 CREATE USER
    const { data, error } = await db
      .from("users")
      .insert([{ name, password, phone }])
      .select()
      .single();

    if (error) {
      showError("User already exists or error occurred");
      return;
    }

    saveUser(data);

  } else {
    // 🔍 LOGIN
    const { data, error } = await db
      .from("users")
      .select("*")
      .eq("name", name)
      .eq("password", password)
      .single();

    if (error || !data) {
      showError("Wrong name or password");
      return;
    }

    saveUser(data);
  }
}


// 💾 SAVE USER
function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
  document.getElementById("loginModal").classList.add("hidden");
  applyUser(user);
}


// 🎯 APPLY USER
function applyUser(user) {
  const nameEl = document.querySelector(".name");
  const phoneEl = document.querySelector(".phone");

  if (nameEl) nameEl.innerText = user.name;
  if (phoneEl) phoneEl.innerText = user.phone;
}


// ⚠️ ERROR UI
function showError(msg) {
  const err = document.getElementById("authError");
  err.innerText = msg;
}

function clearError() {
  document.getElementById("authError").innerText = "";
}