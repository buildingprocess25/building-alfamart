// login_script.js

const APPS_SCRIPT_POST_URL =
  "https://script.google.com/macros/s/AKfycbzPubDTa7E2gT5HeVLv9edAcn1xaTiT3J4BtAVYqaqiFAvFtp1qovTXpqpm-VuNOxQJ/exec";

const PYTHON_API_LOGIN_URL =
  "https://building-alfamart.onrender.com/api/login";

/** Logging ke Apps Script **/
async function logLoginAttempt(username, cabang, status) {
  try {
    await fetch(APPS_SCRIPT_POST_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        requestType: "loginAttempt",
        username,
        cabang,
        status,
      }),
    });
  } catch (error) {
    console.error("Failed to log login attempt:", error);
  }
}

/** Dapatkan role yang diperlukan berdasarkan halaman login **/
function getRequiredRole() {
  const path = window.location.pathname.toLowerCase();

  if (path.includes("estimasi_rab")) return "KONTRAKTOR";
  if (path.includes("spk_form")) return "BRANCH BUILDING & MAINTENANCE MANAGER";

  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const passwordInput = document.getElementById("password");

  /** Toggle mata password **/
  const togglePassword = document.getElementById("togglePassword");
  const eyeOpen = document.getElementById("eyeOpen");
  const eyeSlashed = document.getElementById("eyeSlashed");

  if (togglePassword) {
    togglePassword.onclick = () => {
      const type =
        passwordInput.type === "password" ? "text" : "password";
      passwordInput.type = type;

      eyeOpen.style.display = type === "text" ? "block" : "none";
      eyeSlashed.style.display = type === "password" ? "block" : "none";
    };
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🔹 Validasi jam operasional
    try {
      const now = new Date();
      const hours = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        hour12: false,
      }).format(now);

      const hour = parseInt(hours);
      if (hour < 6 || hour >= 18) {
        loginMessage.textContent =
          "Login di luar jam operasional (06:00 - 18:00 WIB).";
        loginMessage.className = "login-message error";
        loginMessage.style.display = "block";
        return;
      }
    } catch (err) {
      loginMessage.textContent = "Gagal memvalidasi waktu.";
      loginMessage.className = "login-message error";
      loginMessage.style.display = "block";
      return;
    }

    const username = loginForm.username.value;
    const password = passwordInput.value;

    loginMessage.textContent = "Logging in...";
    loginMessage.style.display = "block";
    loginMessage.className = "login-message";

    try {
      const response = await fetch(PYTHON_API_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username, cabang: password }),
      });

      const result = await response.json();

      // ❌ Jika email/password salah
      if (!response.ok || result.status !== "success") {
        logLoginAttempt(username, password, "Failed");
        loginMessage.textContent =
          result.message || "Username atau password salah.";
        loginMessage.className = "login-message error";
        return;
      }

      const userRole = result.role;
      const requiredRole = getRequiredRole(); // SPK atau RAB butuh role tertentu

      // 🔥 **CEK ROLE DI SINI**
      if (requiredRole && userRole !== requiredRole) {
        // ❌ Role salah, tidak boleh login
        logLoginAttempt(username, password, "Failed");
        loginMessage.textContent =
          "Anda tidak memiliki izin untuk mengakses halaman ini.";
        loginMessage.className = "login-message error";

        // ❗ PENTING: jangan simpan session
        sessionStorage.clear();

        // ❗ JANGAN redirect, biarkan tetap di halaman login
        return;
      }

      // ✔ ROLE VALID → LANJUT LOGIN
      sessionStorage.setItem("authenticated", "true");
      sessionStorage.setItem("loggedInUserEmail", username);
      sessionStorage.setItem("loggedInUserCabang", password);
      sessionStorage.setItem("userRole", userRole);

      logLoginAttempt(username, password, "Success");

      loginMessage.textContent = "Login berhasil! Mengarahkan...";
      loginMessage.className = "login-message success";

      setTimeout(() => {
        const redirectUrl = sessionStorage.getItem("redirectTo");
        window.location.href = redirectUrl || "/";
      }, 1200);
    } catch (error) {
      logLoginAttempt(username, password, "Failed");
      loginMessage.textContent = "Gagal terhubung ke server.";
      loginMessage.className = "login-message error";
    }
  });
});
