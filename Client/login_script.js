// login_script.js

// ▼▼▼ URL UNTUK MENCATAT UPAYA LOGIN (OPSIONAL) ▼▼▼
const APPS_SCRIPT_POST_URL = "https://script.google.com/macros/s/AKfycbzPubDTa7E2gT5HeVLv9edAcn1xaTiT3J4BtAVYqaqiFAvFtp1qovTXpqpm-VuNOxQJ/exec"; 
// ▼▼▼ URL BARU UNTUK VALIDASI LOGIN KE BACKEND PYTHON ANDA ▼▼▼
const PYTHON_API_LOGIN_URL = "https://building-alfamart.onrender.com/api/login"; 

/**
 * Mengirim data percobaan login ke Google Apps Script (untuk logging).
 * @param {string} username - Username yang dimasukkan.
 * @param {string} cabang - Password/Cabang yang dimasukkan.
 * @param {string} status - Status login ('Success' atau 'Failed').
 */
async function logLoginAttempt(username, cabang, status) {
    const logData = {
        requestType: 'loginAttempt', // Penanda ini penting untuk backend
        username: username,
        cabang: cabang,
        status: status
    };

    try {
        await fetch(APPS_SCRIPT_POST_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(logData)
        });
        console.log(`Login attempt logged: ${status}`);
    } catch (error) {
        console.error('Failed to log login attempt:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const eyeOpen = document.getElementById("eyeOpen");
    const eyeSlashed = document.getElementById("eyeSlashed");

    if (passwordInput && togglePassword && eyeOpen && eyeSlashed) {
        togglePassword.addEventListener("click", () => {
            const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
            passwordInput.setAttribute("type", type);

            if (type === "password") {
                eyeOpen.style.display = "none";
                eyeSlashed.style.display = "block";
            } else {
                eyeOpen.style.display = "block";
                eyeSlashed.style.display = "none";
            }
        });
    }

    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const now = new Date();
            const options = { timeZone: "Asia/Jakarta", hour: '2-digit', hour12: false };
            const currentHour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));

            const startHour = 6; 
            const endHour = 18; 

            if (currentHour < startHour || currentHour >= endHour) {
                loginMessage.textContent = 'Login di luar jam operasional. Silakan login antara pukul 06:00 - 18:00 WIB.';
                loginMessage.className = 'login-message error';
                loginMessage.style.display = 'block';
                return;
            }
            } catch (err) {
            console.error("Gagal memvalidasi jam:", err);
            loginMessage.textContent = 'Gagal memvalidasi jam, silakan coba lagi.';
            loginMessage.className = 'login-message error';
            loginMessage.style.display = 'block';
            return;
            }

        const username = loginForm.username.value;
        const password = passwordInput.value;

        loginMessage.textContent = 'Logging in...';
        loginMessage.className = 'login-message';
        loginMessage.style.display = 'block';

        try {
            const response = await fetch(PYTHON_API_LOGIN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: username, cabang: password }),
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                logLoginAttempt(username, password, 'Success');

                const userRole = result.role?.toUpperCase() || "";

                // Cek halaman login dari URL
                const path = window.location.pathname.toLowerCase();

                // === LOGIN RAB ===
                if (path.includes("rab")) {
                    if (userRole !== "KONTRAKTOR") {
                        loginMessage.textContent = "Akses ditolak. Halaman RAB hanya bisa diakses oleh KONTRAKTOR.";
                        loginMessage.className = "login-message error";
                        return; // Tetap di halaman login
                    }
                }

                // === LOGIN SPK ===
                if (path.includes("spk")) {
                    if (userRole !== "BRANCH BUILDING & MAINTENANCE MANAGER" && userRole !== "MANAGER") {
                        loginMessage.textContent = "Akses ditolak. Halaman SPK hanya bisa diakses oleh MANAGER.";
                        loginMessage.className = "login-message error";
                        return; // Tetap di login
                    }
                }

                // ==== Jika role sesuai → lanjut login ====
                loginMessage.textContent = "Login berhasil! Mengarahkan...";
                loginMessage.className = "login-message success";

                sessionStorage.setItem("authenticated", "true");
                sessionStorage.setItem("loggedInUserEmail", username);
                sessionStorage.setItem("loggedInUserCabang", password);
                sessionStorage.setItem("userRole", userRole);

                setTimeout(() => {
                    const redirectUrl = sessionStorage.getItem("redirectTo");
                    if (redirectUrl) {
                        sessionStorage.removeItem("redirectTo");
                        window.location.href = redirectUrl;
                    } else {
                        window.location.href = "/";
                    }
                }, 1500);

            } else {
                // === Notif password salah ===
                if (result.message === "Invalid credentials") {
                    loginMessage.textContent = "Email benar, tetapi password salah.";
                } else {
                    loginMessage.textContent = result.message || "Username atau password salah.";
                }

                loginMessage.className = "login-message error";
                logLoginAttempt(username, password, "Failed");
            }
        } catch (error) {
            logLoginAttempt(username, password, 'Failed');
            loginMessage.textContent = 'Gagal terhubung ke server. Coba lagi nanti.';
            loginMessage.className = 'login-message error';
        }
    });
});