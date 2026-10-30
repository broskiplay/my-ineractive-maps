(function () {
    const soundStorageKey = "broskiplay_ui_sound";
    const themeStorageKey = "bp_theme";
    const style = document.createElement("style");
    style.textContent = `
        .ui-controls {
            position: fixed; top: 14px; right: 14px; z-index: 10000;
            display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .ui-sound-toggle, .ui-theme-toggle {
            display: grid; place-items: center; width: 44px; height: 44px;
            border: 1px solid rgba(84, 220, 255, .55); border-radius: 7px;
            background: rgba(12, 17, 24, .92); color: #54dcff;
            box-shadow: 0 0 18px rgba(84, 220, 255, .12);
            cursor: pointer; backdrop-filter: blur(8px);
            transition: background .2s, border-color .2s, color .2s, transform .2s;
        }
        .ui-sound-toggle:hover, .ui-theme-toggle:hover { background: #17232c; border-color: #54dcff; }
        .ui-sound-toggle:focus-visible, .ui-theme-toggle:focus-visible { outline: 2px solid #c7ff3f; outline-offset: 3px; }
        .ui-sound-toggle[aria-pressed="false"] { color: #9aa8b8; border-color: #505b68; box-shadow: none; }
        .ui-sound-toggle svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
        .ui-theme-toggle svg { width: 20px; height: 20px; overflow: visible; }
        .ui-theme-toggle .theme-icon { transform-origin: center; transition: transform .6s cubic-bezier(.4, 0, .2, 1); }
        .ui-theme-toggle.flipped .theme-icon { transform: scaleX(-1); }
        @media (max-width: 480px) {
            .ui-controls { top: 10px; right: 10px; gap: 6px; }
            .ui-sound-toggle, .ui-theme-toggle { width: 42px; height: 42px; }
        }
    `;
    document.head.append(style);

    let enabled = true;
    let audioContext = null;
    try {
        enabled = localStorage.getItem(soundStorageKey) !== "off";
    } catch (error) {
        console.warn("Не удалось прочитать настройку звука:", error);
    }

    function renderToggle(button) {
        button.setAttribute("aria-pressed", String(enabled));
        button.setAttribute("aria-label", enabled ? "Выключить звуковые эффекты" : "Включить звуковые эффекты");
        button.title = enabled ? "Звук включён" : "Звук выключен";
        button.innerHTML = enabled
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11"/></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="m17 9 5 6m0-6-5 6"/></svg>';
    }

    function playClick() {
        if (!enabled) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        try {
            audioContext ||= new AudioContextClass();
            if (audioContext.state === "suspended") audioContext.resume().catch(() => {});

            const now = audioContext.currentTime;
            const tone = audioContext.createOscillator();
            const gain = audioContext.createGain();
            tone.type = "sine";
            tone.frequency.setValueAtTime(720, now);
            tone.frequency.exponentialRampToValueAtTime(390, now + 0.055);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.022, now + 0.004);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
            tone.connect(gain);
            gain.connect(audioContext.destination);
            tone.start(now);
            tone.stop(now + 0.08);
        } catch (error) {
            console.warn("Не удалось воспроизвести звуковой эффект:", error);
        }
    }

    window.playGameUiSound = playClick;

    document.addEventListener("click", event => {
        if (!(event.target instanceof Element)) return;
        const control = event.target.closest("button, a[href], summary");
        if (!control || control.classList.contains("ui-sound-toggle")) return;
        playClick();
    }, true);

    document.addEventListener("contextmenu", event => {
        if (event.target instanceof Element && event.target.closest(".leaflet-marker-icon")) {
            playClick();
        }
    }, true);

    function addToggle() {
        if (document.querySelector(".ui-sound-toggle")) return;
        const button = document.createElement("button");
        button.className = "ui-sound-toggle";
        button.type = "button";
        renderToggle(button);
        button.addEventListener("click", () => {
            enabled = !enabled;
            try {
                localStorage.setItem(soundStorageKey, enabled ? "on" : "off");
            } catch (error) {
                console.warn("Не удалось сохранить настройку звука:", error);
            }
            renderToggle(button);
            if (enabled) playClick();
        });
        getControlsContainer().append(button);
    }

    function getControlsContainer() {
        let container = document.querySelector(".ui-controls");
        if (!container) {
            container = document.createElement("div");
            container.className = "ui-controls";
            document.body.append(container);
        }
        return container;
    }

    function currentTheme() {
        return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    }

    function renderThemeIcon(theme) {
        // Круг, разделённый пополам по вертикали: левая половина светлая, правая тёмная.
        return '<svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">'
            + '<path d="M12 2a10 10 0 0 1 0 20Z" fill="#ffffff"/>'
            + '<path d="M12 2a10 10 0 0 0 0 20Z" fill="#000000"/>'
            + '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.4"/>'
            + '</svg>';
    }

    function renderThemeToggle(button, animate) {
        const theme = currentTheme();
        button.setAttribute("aria-label", theme === "light" ? "Переключить на тёмную тему" : "Переключить на светлую тему");
        button.title = theme === "light" ? "Тёмная тема" : "Светлая тема";
        button.classList.toggle("flipped", theme === "light");
        if (!button.querySelector(".theme-icon")) {
            button.innerHTML = renderThemeIcon(theme);
        }
    }

    function addThemeToggle() {
        if (document.querySelector(".ui-theme-toggle")) return;
        const button = document.createElement("button");
        button.className = "ui-theme-toggle";
        button.type = "button";
        renderThemeToggle(button);
        button.addEventListener("click", () => {
            const next = currentTheme() === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", next);
            try { localStorage.setItem(themeStorageKey, next); } catch (error) {
                console.warn("Не удалось сохранить тему:", error);
            }
            renderThemeToggle(button);
            playClick();
        });
        getControlsContainer().append(button);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            addToggle();
            addThemeToggle();
        }, { once: true });
    } else {
        addToggle();
        addThemeToggle();
    }
})();