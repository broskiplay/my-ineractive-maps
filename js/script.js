// =========================================================
// 1. ДАННЫЕ ДЛЯ РЕНДЕРА (Шаблоны)
// =========================================================

// Данные карт Stellar Blade
const stellarMapConfigs = [
    { id: "eidos7", name: "Эйдос 7 (Eidos 7)", page: "eidos7.html", markersFile: "eidos7_data.json" },
    { id: "xion", name: "Город Ксион (Xion City)", page: "xion.html", markersFile: "xion_data.json" },
    { id: "wasteland", name: "Пустошь (Wasteland)", page: "wasteland.html", markersFile: "wasteland_data.json" },
    { id: "altess-levoire", name: "Атлесс Левуар (Altess Levoire)", page: "altess_levoire.html", markersFile: "altess_levoire_data.json" },
    { id: "matrix-11", name: "Матрица 11 (Matrix 11)", page: "matrix11.html", markersFile: "stellar_blade_matrix-11_markers.json" },
    { id: "great-desert", name: "Великая пустыня (Great Desert)", page: "great_desert.html", markersFile: "stellar_blade_great-desert_markers.json" },
    { id: "abyss-levoire", name: "Бездна Левуар (Abyss Levoire)", page: "abyss_levoire.html", markersFile: "stellar_blade_abyss-levoire_markers.json" },
    { id: "spire-4", name: "Шпиль 4 (Spire 4)", page: "spire4.html", markersFile: "stellar_blade_spire-4_markers.json" },
    { id: "eidos-9", name: "Эйдос 9 (Eidos 9)", page: "eidos9.html", markersFile: "stellar_blade_eidos-9_markers.json" }
];

// Данные заглушек
const placeholderGames = [
    { title: "Tainted Grail: The Fall of Avalon", theme: "theme-tainted", placeholderClass: "placeholder-tainted" },
    { title: "Gothic 1 Remake", theme: "theme-gothic", placeholderClass: "placeholder-gothic" },
    { title: "Atomic Heart", theme: "theme-atomic", placeholderClass: "placeholder-atomic" }
];

// =========================================================
// 2. ГЕНЕРАЦИЯ HTML
// =========================================================

function renderGames() {
    const container = document.getElementById("games-container");
    if (!container) return;

    // Рендер Stellar Blade
    let stellarHTML = `
        <details class="game-dropdown theme-stellar">
            <summary>
                <div class="game-banner">
                    <img class="game-banner-art" src="./stellar-blade-map/maps/eidos7.png" alt="">
                    <img class="game-banner-image" src="./stellar-blade-map/maps/stellar-blade-logo.png" alt="Stellar Blade — выбрать локацию">
                </div>
                <div class="game-info">
                    <div class="game-title-block">
                        <span class="game-title">Stellar Blade</span>
                        <div class="game-progress">
                            <div class="game-progress-heading"><span>Найдено меток</span><strong id="stellar-progress-value">—%</strong></div>
                            <div class="game-progress-track" id="stellar-progress-bar" role="progressbar" aria-label="Общий прогресс Stellar Blade" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="stellar-progress-fill"></span></div>
                            <span class="game-progress-count" id="stellar-progress-count">Загрузка меток...</span>
                        </div>
                    </div>
                    <span class="game-indicators">
                        <span class="game-badge">${stellarMapConfigs.length} карт</span>
                        <span class="game-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span>
                    </span>
                </div>
            </summary>
            <div class="maps-list">
    `;

    stellarMapConfigs.forEach(config => {
        stellarHTML += `
            <a href="./stellar-blade-map/${config.page}" class="map-link">
                <span class="map-name">
                    <svg class="map-marker" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                    ${config.name}
                </span>
                <span class="status" aria-label="Открыть">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </span>
            </a>
        `;
    });

    stellarHTML += `
            </div>
        </details>
    `;
    container.innerHTML = stellarHTML;

    // Рендер заглушек
    placeholderGames.forEach(game => {
        const placeholderHTML = `
            <article class="game-placeholder ${game.theme} ${game.placeholderClass}" aria-label="${game.title} — карта в разработке">
                <div class="game-banner placeholder-banner">
                    <span class="game-badge">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                        Заблокировано
                    </span>
                    <svg class="placeholder-lock" viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="14" width="24" height="15" rx="3"/><path d="M9 14V9a7 7 0 0 1 14 0v5M16 20v4"/></svg>
                </div>
                <div class="game-info"><h3 class="game-title">${game.title}</h3></div>
                <p class="placeholder-copy">Интерактивная карта для этого мира появится здесь.</p>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', placeholderHTML);
    });
}

// Запускаем рендер сразу (скрипт подключен с defer)
renderGames();


// =========================================================
// 3. ЛОГИКА (Twitch, YouTube, Поиск, Прогресс, Загрузка)
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    // --- Twitch и YouTube ---
    const twitchButton = document.getElementById("twitch-button");
    const twitchButtonLabel = document.getElementById("twitch-button-label");
    const previewTwitchLive = new URLSearchParams(window.location.search).get("previewTwitch") === "live";

    function renderTwitchButton(isLive, status = "") {
        twitchButton.classList.toggle("is-live", isLive);
        twitchButton.href = "https://www.twitch.tv/broskiplay";
        twitchButtonLabel.textContent = isLive ? "МОЙ СТРИМ · ONLINE" : "Twitch";
        twitchButton.title = isLive ? `BroskiPlay в эфире${status ? `: ${status}` : ""}` : "Канал BroskiPlay на Twitch";
    }

    async function updateTwitchButton() {
        if (previewTwitchLive) { renderTwitchButton(true, "Предпросмотр"); return; }
        try {
            const response = await fetch("https://decapi.me/twitch/uptime/broskiplay", { cache: "no-store" });
            if (!response.ok) throw new Error(`Twitch status returned ${response.status}`);
            const status = (await response.text()).trim();
            const isLive = Boolean(status) && !/offline|not found|error|invalid|rate limit/i.test(status);
            renderTwitchButton(isLive, isLive ? status : "");
        } catch (error) {
            renderTwitchButton(false);
            console.warn("Не удалось проверить статус Twitch:", error);
        }
    }

    updateTwitchButton();
    if (!previewTwitchLive) window.setInterval(updateTwitchButton, 5 * 60 * 1000);

    const youtubeButton = document.getElementById("youtube-button");
    const youtubeCacheKey = "broskiplay_latest_video";
    const youtubeFreshWindow = 12 * 60 * 60 * 1000;
    let youtubeExpiryTimer = null;

    function renderYoutubeButton(video) {
        const age = Date.now() - video.publishedAt;
        const isNew = age >= 0 && age < youtubeFreshWindow;
        youtubeButton.classList.toggle("has-new-video", isNew);
        youtubeButton.href = isNew ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}` : "https://www.youtube.com/@broskiplayt/videos";
        youtubeButton.title = isNew ? `Новое видео: ${video.title}` : "Видео BroskiPlay на YouTube";
        youtubeButton.setAttribute("aria-label", isNew ? `Новое видео на YouTube: ${video.title}` : "Видео BroskiPlay на YouTube");
        window.clearTimeout(youtubeExpiryTimer);
        if (isNew) youtubeExpiryTimer = window.setTimeout(() => renderYoutubeButton(video), youtubeFreshWindow - age + 50);
    }

    function readCachedYoutubeVideo() {
        try {
            const video = JSON.parse(localStorage.getItem(youtubeCacheKey) || "null");
            return video && typeof video.id === "string" && Number.isFinite(video.publishedAt) ? video : null;
        } catch (error) { return null; }
    }

    function getXmlValue(element, localName) {
        return Array.from(element.getElementsByTagName("*")).find(node => node.localName === localName)?.textContent.trim() || "";
    }

    async function updateYoutubeButton() {
        const cachedVideo = readCachedYoutubeVideo();
        if (cachedVideo) renderYoutubeButton(cachedVideo);
        try {
            const feedUrl = "https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=UCOEXmcNe8D9bf_tnBE-gMkA";
            const response = await fetch(feedUrl, { cache: "no-store", headers: { "X-Respond-With": "html", "X-No-Cache": "true" } });
            if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);
            const feed = new DOMParser().parseFromString(await response.text(), "application/xml");
            const entry = Array.from(feed.getElementsByTagName("*")).find(node => node.localName === "entry");
            if (!entry) throw new Error("YouTube feed contains no video entries");
            const video = {
                id: getXmlValue(entry, "videoId"),
                title: getXmlValue(entry, "title"),
                publishedAt: Date.parse(getXmlValue(entry, "published"))
            };
            if (!video.id || !video.title || !Number.isFinite(video.publishedAt)) throw new Error("YouTube feed has invalid video metadata");
            localStorage.setItem(youtubeCacheKey, JSON.stringify(video));
            renderYoutubeButton(video);
        } catch (error) {
            if (!cachedVideo) renderYoutubeButton({ id: "", title: "", publishedAt: 0 });
            console.warn("Не удалось проверить последнее видео YouTube:", error);
        }
    }
    updateYoutubeButton();
    window.setInterval(updateYoutubeButton, 15 * 60 * 1000);

    // --- Поиск, Прогресс, Переходы ---
    const mapLinks = [...document.querySelectorAll(".map-link")];
    const gameSearchInput = document.getElementById("game-search-input");
    const gameSearchStatus = document.getElementById("game-search-status");
    const gameCards = [...document.querySelectorAll("#games-container > .game-dropdown, #games-container > .game-placeholder")];

    // Поиск
    gameSearchInput.addEventListener("input", () => {
        const query = gameSearchInput.value.trim().toLocaleLowerCase("ru");
        let visibleCount = 0;
        gameCards.forEach(card => {
            const title = card.querySelector(".game-title").textContent.trim().toLocaleLowerCase("ru");
            const isMatch = !query || title.includes(query);
            card.hidden = !isMatch;
            if (isMatch) visibleCount++;
        });
        gameSearchStatus.textContent = query ? (visibleCount ? `Найдено: ${visibleCount} из ${gameCards.length}` : "Игры не найдены. Проверьте запрос.") : "";
    });

    // Кнопка "Продолжить последнюю карту"
    let savedMap = null;
    try { savedMap = localStorage.getItem("sb_last_map"); } catch (error) { console.error("Не удалось прочитать последнюю карту:", error); }
    if (savedMap && mapLinks.length) {
        const gameRoot = new URL(".", mapLinks[0].href);
        let savedMapUrl;
        try { savedMapUrl = new URL(savedMap, gameRoot); } catch (error) { console.error("Не удалось открыть последнюю карту:", error); }
        const lastMap = savedMapUrl && mapLinks.find((link) => {
            const mapUrl = new URL(link.href);
            return mapUrl.origin === savedMapUrl.origin && mapUrl.pathname === savedMapUrl.pathname;
        });
        if (lastMap) {
            document.getElementById("last-map-link").href = lastMap.href;
            document.getElementById("last-map-name").textContent = lastMap.querySelector(".map-name").textContent.trim();
            document.getElementById("last-map").hidden = false;
        }
    }

    // Конфиги карт для подсчета прогресса
    const mapDataPromises = new Map();

    function readLocalArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (error) { return []; }
    }

    function loadMarkerIds(config) {
        if (!mapDataPromises.has(config.id)) {
            const promise = fetch(`./stellar-blade-map/data/${config.markersFile}`)
                .then(response => {
                    if (!response.ok) throw new Error(`Не удалось загрузить ${config.markersFile}`);
                    return response.json();
                })
                .then(data => Array.isArray(data) ? data : data.markers)
                .then(markers => Array.isArray(markers) ? markers : []);
            mapDataPromises.set(config.id, promise);
        }
        return mapDataPromises.get(config.id);
    }

    async function renderStellarProgress(cloudProgress = new Map()) {
        const results = await Promise.all(stellarMapConfigs.map(async config => {
            const link = mapLinks.find(item => new URL(item.href).pathname.endsWith(`/${config.page}`));
            const name = link?.querySelector(".map-name")?.textContent.trim() || config.page;
            const ids = new Set();
            try {
                const markers = await loadMarkerIds(config);
                markers.forEach(marker => { if (marker?.id != null) ids.add(String(marker.id)); });
            } catch (error) { console.warn(`Не удалось загрузить метки карты ${config.page}:`, error); }
            
            readLocalArray(`sb_markers_${config.id}`).forEach(marker => { if (marker?.id != null) ids.add(String(marker.id)); });

            const foundIds = new Set([...readLocalArray(`sb_found_${config.id}`), ...(cloudProgress.get(config.id) || [])].map(String));
            const found = [...ids].filter(id => foundIds.has(id)).length;
            const total = ids.size;
            const percent = total ? Math.round(found / total * 100) : null;
            
            const progressLabel = link?.querySelector(".status");
            if (progressLabel) {
                let progress = progressLabel.querySelector(".map-progress");
                if (!progress) {
                    progress = document.createElement("span");
                    progress.className = "map-progress";
                    progressLabel.prepend(progress);
                }
                progress.textContent = percent === null ? "—" : `${percent}%`;
                link.title = percent === null ? `${name}: прогресс пока недоступен` : `${name}: ${found} из ${total} меток, ${percent}% исследовано`;
            }
            return { found, total };
        }));

        const found = results.reduce((sum, item) => sum + item.found, 0);
        const total = results.reduce((sum, item) => sum + item.total, 0);
        const percent = total ? Math.round(found / total * 100) : null;
        
        const value = document.getElementById("stellar-progress-value");
        const count = document.getElementById("stellar-progress-count");
        const fill = document.getElementById("stellar-progress-fill");
        const bar = document.getElementById("stellar-progress-bar");
        if (value) value.textContent = percent === null ? "—%" : `${percent}%`;
        if (count) count.textContent = total ? `${found} / ${total} меток` : "Прогресс пока недоступен";
        if (fill) fill.style.width = `${percent ?? 0}%`;
        if (bar) bar.setAttribute("aria-valuenow", String(percent ?? 0));
    }

    window.refreshStellarProgress = async user => {
        const cloudProgress = new Map();
        if (user) {
            const db = firebase.firestore();
            await Promise.all(stellarMapConfigs.map(async config => {
                try {
                    const snapshot = await db.collection("users").doc(user.uid).collection("mapProgress").doc(config.id).get();
                    const data = snapshot.exists ? snapshot.data() : null;
                    cloudProgress.set(config.id, Array.isArray(data?.foundIds) ? data.foundIds : Array.isArray(data?.found) ? data.found : []);
                } catch (error) { cloudProgress.set(config.id, []); }
            }));
        }
        await renderStellarProgress(cloudProgress);
    };
    renderStellarProgress();

    // Экран загрузки карты и фикс bfcache
    const loadingTips = [
        "Отмечайте найденные метки прямо в карточке: прогресс сохранится автоматически.",
        "Правый клик по метке на карте быстро отмечает её найденной.",
        "Используйте фильтры категорий, чтобы быстрее находить нужные предметы.",
        "Войдите через Google, чтобы синхронизировать личный прогресс между устройствами."
    ];
    const loadingScreen = document.getElementById("map-loading-screen");
    let loadingTimer = null;

    window.addEventListener("pagehide", () => {
        if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null; }
        loadingScreen.hidden = true;
    });
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) loadingScreen.hidden = true;
    });

    [...mapLinks, document.getElementById("last-map-link")].forEach(link => {
        if(!link) return;
        link.addEventListener("click", event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            const mapName = link.querySelector(".map-name")?.textContent.trim() || document.getElementById("last-map-name").textContent.trim();
            document.getElementById("map-loading-title").textContent = mapName || "Подготовка карты";
            document.getElementById("map-loading-tip").textContent = loadingTips[Math.floor(Math.random() * loadingTips.length)];
            loadingScreen.hidden = false;
            loadingTimer = window.setTimeout(() => window.location.assign(link.href), 650);
        });
    });

    // --- Firebase Авторизация ---
    const firebaseConfig = {
        apiKey: "AIzaSyBZ29h18Z1k0gE4dAEca5JH8yePQgxhaII",
        authDomain: "broskiplaymaps.firebaseapp.com",
        projectId: "broskiplaymaps",
        storageBucket: "broskiplaymaps.firebasestorage.app",
        messagingSenderId: "418362476965",
        appId: "1:418362476965:web:59ce4e677b1a0a84d7404c",
        measurementId: "G-D5PQJQ7HZG"
    };

    const auth = (() => {
        if (typeof firebase === "undefined") {
            console.warn("Firebase не загружен — вход через Google недоступен, остальной сайт работает.");
            return null;
        }
        try {
            firebase.initializeApp(firebaseConfig);
            return firebase.auth();
        } catch (error) {
            console.warn("Не удалось инициализировать Firebase:", error);
            return null;
        }
    })();

    auth?.onAuthStateChanged((user) => {
        const statusEl = document.getElementById("auth-status");
        const btnEl = document.getElementById("auth-btn");
        const avatarEl = document.getElementById("auth-avatar");

        if (user) {
            const displayName = String(user.displayName || user.email || "Google").replace(/[&<>"']/g, ch => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
            }[ch]));
            // Заменен инлайн-стиль на класс .auth-success-text
            statusEl.innerHTML = `<b>${displayName}</b><br><span class="auth-success-text">● Облачная синхронизация активна</span>`;
            btnEl.textContent = "🚪 Выйти";
            btnEl.classList.add("logout");
            if (user.photoURL) {
                avatarEl.src = user.photoURL;
                avatarEl.style.display = "block"; // Оставлено, так как управляет видимостью
            }
        } else {
            statusEl.innerHTML = `<b>Гостевой режим</b><br><span>Войдите через Google для синхронизации меток</span>`;
            btnEl.innerHTML = `<svg class="google-icon" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg><span>Войти с Google</span>`;
            btnEl.classList.remove("logout");
            avatarEl.style.display = "none";
        }
        
        if (typeof window.refreshStellarProgress === 'function') {
            window.refreshStellarProgress(user).catch((error) => {
                console.warn("Не удалось обновить общий прогресс Stellar Blade:", error);
            });
        }
    });

    function toggleGoogleAuth() {
        if (!auth) {
            alert("Вход через Google сейчас недоступен: Firebase не загрузился. Проверьте подключение к интернету и обновите страницу.");
            return;
        }
        if (auth.currentUser) {
            auth.signOut();
        } else {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch((err) => {
                alert("Ошибка авторизации Google: " + err.message);
            });
        }
    }

    document.getElementById("auth-btn").addEventListener("click", toggleGoogleAuth);
});