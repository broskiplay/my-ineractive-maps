(function () {
    const soundStorageKey = "broskiplay_ui_sound";
    const style = document.createElement("style");
    style.textContent = `
        .ui-sound-toggle {
            position: fixed; top: 14px; right: 14px; z-index: 10000;
            display: grid; place-items: center; width: 44px; height: 44px;
            border: 1px solid rgba(84, 220, 255, .55); border-radius: 7px;
            background: rgba(12, 17, 24, .92); color: #54dcff;
            box-shadow: 0 0 18px rgba(84, 220, 255, .12);
            cursor: pointer; backdrop-filter: blur(8px);
        }
        .ui-sound-toggle:hover { background: #17232c; border-color: #54dcff; }
        .ui-sound-toggle:focus-visible { outline: 2px solid #c7ff3f; outline-offset: 3px; }
        .ui-sound-toggle[aria-pressed="false"] { color: #9aa8b8; border-color: #505b68; box-shadow: none; }
        .ui-sound-toggle svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
        @media (max-width: 480px) { .ui-sound-toggle { top: 10px; right: 10px; width: 42px; height: 42px; } }
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
        document.body.append(button);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addToggle, { once: true });
    } else {
        addToggle();
    }
})();