(function () {
    const ownerEmail = "vitspuzyrev@gmail.com";
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

    function firebaseAuthOrNull() {
        if (typeof firebase === "undefined" || !firebase.apps?.length) return null;
        try { return firebase.auth(); } catch (_) { return null; }
    }

    window.isMapOwner = function (user) {
        if (user === undefined) user = firebaseAuthOrNull()?.currentUser || null;
        const isLocalHost = localHosts.has(window.location.hostname);
        const searchParams = new URLSearchParams(window.location.search);
        let localDeveloperMode = false;
        if (isLocalHost) {
            try {
                if (searchParams.get("dev") === "1") {
                    sessionStorage.setItem("sb_local_dev_mode", "1");
                }
                localDeveloperMode = sessionStorage.getItem("sb_local_dev_mode") === "1";
            } catch (_) { /* приватный режим браузера */ }
        }
        return localDeveloperMode || Boolean(user?.emailVerified && user.email?.toLowerCase() === ownerEmail);
    };

    function updateAccess(user) {
        if (!document.body) {
            document.addEventListener("DOMContentLoaded", () => updateAccess(user), { once: true });
            return;
        }
        const isOwner = window.isMapOwner(user);
        document.body.classList.toggle("map-owner", isOwner);
        document.querySelectorAll("[data-owner-only]").forEach(element => {
            element.hidden = !isOwner;
        });
        window.dispatchEvent(new CustomEvent("map-auth-state-changed", {
            detail: { user, isOwner }
        }));
    }

    const auth = firebaseAuthOrNull();
    if (auth) {
        auth.onAuthStateChanged(updateAccess);
    } else {
        updateAccess(null);
    }
})();
