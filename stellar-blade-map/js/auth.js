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
      btnEl.textContent = "🔑 Google";
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