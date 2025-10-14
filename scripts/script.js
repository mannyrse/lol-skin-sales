const patchVersion = "15.20.1";

// Fetch data from personal Google sheets
async function fetchSkinData() {
    const response = await fetch("https://script.google.com/macros/s/AKfycbxqlNW0mNo7FsGo0hR2_2jwJ_WAxC1HiJoKB92Sfupv_1llL1vz04DKRivr-vxPtpQwvQ/exec");
    const data = await response.json();
    return data;
}

// Fetch the full champion data (all champs + skins) once
async function fetchChampionFull() {
    if (!window._championFull) {
        const url = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/en_US/championFull.json`;
        const response = await fetch(url);
        const data = await response.json();
        window._championFull = data.data; // object keyed by championId
    }
    return window._championFull;
}

// Find champion ID from championFull by name
async function getChampionId(name) {
    const champFull = await fetchChampionFull();
    const champs = Object.values(champFull);
    const champ = champs.find(
        c => c.name.toLowerCase().replace(/['\s]/g, "") === name.toLowerCase().replace(/['\s]/g, "")
    );
    return champ ? champ.id : null;
}

// Find skin number by matching name
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

// Construct splash art image URL (with special-case handling)
function buildSplashUrl(championId, skinNum) {
    // Riot’s inconsistent champion naming for splash images
    const specialCases = {
        Fiddlesticks: "FiddleSticks",
        // Add more if others exist?
        // Wukong: "MonkeyKing",
    };

    const realId = specialCases[championId] || championId;

    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${realId}_${skinNum}.jpg`;
}

// Render all skins to the page
async function renderSkins() {
    // Auto-generate the current week's date range
    const weekZero = new Date(2025, 7, 4);
    const today = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksPassed = Math.floor((today - weekZero) / msPerWeek);
    const currentWeekStart = new Date(weekZero.getTime() + weeksPassed * msPerWeek);
    const nextWeekStart = new Date(currentWeekStart.getTime() + msPerWeek);

    // Format as "Month Day, Year"
    const options = { year: "numeric", month: "long", day: "numeric" };
    const formattedRange = `${currentWeekStart.toLocaleDateString("en-US", options)} – ${nextWeekStart.toLocaleDateString("en-US", options)}`;

    document.getElementById("dateRange").textContent = formattedRange;

    const container = document.getElementById("cardContainer");
    const loading = document.getElementById("loadingSpinner");
    const skinData = await fetchSkinData();

    loading.style.display = "block";

    for (const skin of skinData) {
        try {
            const champId = await getChampionId(skin.champion);
            if (!champId) {
                console.error(`Champion not found: ${skin.champion}`);
                continue;
            }

            const skinNum = await findSkinNumber(champId, skin.skin);
            const splashUrl = buildSplashUrl(champId, skinNum);

            const card = document.createElement("div");
            card.className = "skin-card";
            card.innerHTML = `
                <div class="discount-badge">${skin.discount}% OFF</div>
                <img class="splash-img" loading="lazy" src="${splashUrl}" alt="${skin.skin}">
                <h3>${skin.skin}</h3>
                <p>Champion: ${skin.champion}</p>
                <p><img class="rp-icon" src="images/RP_icon.png"><strong>${skin.price} RP</strong></p>
                <a href="${skin.spotlight}" target="_blank">View Skin Spotlight</a>
            `;
            container.appendChild(card);

        } catch (error) {
            console.error(`Error rendering skin for ${skin.champion}:`, error);
        } finally {
            loading.style.display = "none";
        }
    }
}

// Start rendering on load
renderSkins();

// Fullscreen images on click
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('cardContainer').addEventListener('click', (event) => {
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
