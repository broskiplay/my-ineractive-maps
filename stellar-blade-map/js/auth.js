const GOOGLE_BTN_HTML = '<svg class="google-icon" width="14" height="14" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Google</span>';

function firebaseAuth() {
  if (typeof firebase === "undefined" || !firebase.apps?.length) return null;
  try { return firebase.auth(); } catch (_) { return null; }
}

export function bindAuth(state) {
  const auth = firebaseAuth();
  if (!auth) {
    console.warn("Firebase не инициализирован — вход через Google недоступен, карта работает локально.");
    return;
  }

  auth.onAuthStateChanged((user) => {
    const statusEl = document.getElementById("auth-status");
    const btnEl = document.getElementById("auth-btn");
    const avatarEl = document.getElementById("auth-avatar");
    if (!statusEl || !btnEl) return;

    if (user) {
      const name = user.displayName || user.email || "Google";
      statusEl.innerHTML = `<b>${escapeHtml(name)}</b><br><span style="color:var(--accent-cyan)">● Облако активно</span>`;
      btnEl.textContent = "🚪 ВЫЙТИ";
      btnEl.classList.add("logout");
      btnEl.style.background = "";
      if (user.photoURL && avatarEl) {
        avatarEl.src = user.photoURL;
        avatarEl.style.display = "block";
      }
    } else {
      statusEl.innerHTML = "<b>Локальный режим</b><br><span>Синхронизация выключена</span>";
      btnEl.innerHTML = GOOGLE_BTN_HTML;
      btnEl.classList.remove("logout");
      btnEl.style.background = "";
      if (avatarEl) avatarEl.style.display = "none";
    }

    // Переключаем личные метки пользователя
    import("./cloud.js").then((m) => m.activateUserMarkers(state, user)).catch(() => {});
  });
}

export function toggleGoogleAuth() {
  const auth = firebaseAuth();
  if (!auth) {
    alert("Вход через Google сейчас недоступен: Firebase не загрузился. Проверьте подключение к интернету и обновите страницу.");
    return;
  }
  if (auth.currentUser) {
    auth.signOut();
    return;
  }
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch((err) => alert("Ошибка входа через Google: " + err.message));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}