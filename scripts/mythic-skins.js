const patchVersion = "15.24.1";

// Fetch mythic skins from your new sheet
async function fetchSkinData() {
    const response = await fetch(
        "https://script.google.com/macros/s/AKfycbxqlNW0mNo7FsGo0hR2_2jwJ_WAxC1HiJoKB92Sfupv_1llL1vz04DKRivr-vxPtpQwvQ/exec?sheet=Mythic"
    );
    const data = await response.json();
    return data;
}

// Fetch championFull only once
async function fetchChampionFull() {
    if (!window._championFull) {
        const url = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/en_US/championFull.json`;
        const response = await fetch(url);
        const data = await response.json();
        window._championFull = data.data;
    }
    return window._championFull;
}

// Match champion names
async function getChampionId(name) {
    const champFull = await fetchChampionFull();
    const champs = Object.values(champFull);
    const champ = champs.find(
        c =>
            c.name.toLowerCase().replace(/['\s]/g, "") ===
            name.toLowerCase().replace(/['\s]/g, "")
    );
    return champ ? champ.id : null;
}

// Find skin number
async function findSkinNumber(championId, skinName) {
    const champFull = await fetchChampionFull();
    const champ = champFull[championId];
    if (!champ) return 0;

    return (
        champ.skins.find(
            s => s.name.trim().toLowerCase() === skinName.trim().toLowerCase()
        )?.num || 0
    );
}

// Fix splash name inconsistencies
function buildSplashUrl(championId, skinNum) {
    const specialCases = {
        Fiddlesticks: "FiddleSticks",
    };

    const realId = specialCases[championId] || championId;

    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${realId}_${skinNum}.jpg`;
}

// Render a category (featured vs biweekly)
async function renderCategory(skins, container) {
    for (const skin of skins) {
        try {
            const champId = await getChampionId(skin.champion);
            if (!champId) continue;

            const skinNum = await findSkinNumber(champId, skin.skin);
            const splashUrl = buildSplashUrl(champId, skinNum);

            const card = document.createElement("div");
            card.className = "skin-card mythic-card";

            card.innerHTML = `
                <img class="splash-img" loading="lazy" src="${splashUrl}" alt="${skin.skin}">
                <h3>${skin.skin}</h3>
                <p>Champion: ${skin.champion}</p>
                <p>
                    <img class="rp-icon mythic" src="images/mythic_icon.png">
                    <strong>${skin.price}</strong>
                </p>
                <a href="${skin.spotlight}" target="_blank">View Skin Spotlight</a>
            `;

            container.appendChild(card);

        } catch (error) {
            console.error(`Error rendering skin for ${skin.champion}:`, error);
        }
    }
}

// Main render function
async function renderSkins() {
    const biweeklyContainer = document.getElementById("cardContainer");
    const featuredContainer = document.getElementById("featuredContainer");
    const loading = document.getElementById("loadingSpinner");
    const patchElement = document.getElementById("patch");

    loading.style.display = "block";

    const skinData = await fetchSkinData();

    // Split Featured vs Biweekly
    const featured = skinData.filter(s => s.category?.toLowerCase() === "featured");
    const biweekly = skinData.filter(s => s.category?.toLowerCase() === "biweekly");

    // Update patch text
    if (patchElement && skinData.length > 0) {
        patchElement.textContent = `Current Patch: ${skinData[0].patch || patchVersion}`;
    }

    // Render both sections
    await renderCategory(featured, featuredContainer);
    await renderCategory(biweekly, biweeklyContainer);

    loading.style.display = "none";
}

renderSkins();

// Fullscreen images on click
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('splash-img')) {
            openFullscreen(event.target.src, event.target.alt);
        }
    });

    function openFullscreen(imgSrc, altText) {
        const overlay = document.createElement('div');
        overlay.classList.add('fullscreen-overlay');

        const fullscreenImg = document.createElement('img');
        fullscreenImg.src = imgSrc;
        fullscreenImg.alt = altText || '';

        overlay.appendChild(fullscreenImg);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        function escListener(e) {
            if (e.key === 'Escape') {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', escListener);
                }
            }
        }
        document.addEventListener('keydown', escListener);
    }
});
