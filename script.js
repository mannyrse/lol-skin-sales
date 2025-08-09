const patchVersion = "15.15.1";

// Fetch data from personal Google sheets
async function fetchSkinData() {
    const response = await fetch("https://script.google.com/macros/s/AKfycbxqlNW0mNo7FsGo0hR2_2jwJ_WAxC1HiJoKB92Sfupv_1llL1vz04DKRivr-vxPtpQwvQ/exec");
    const data = await response.json();
    return data;
}

// Format champion ID correctly for Riot API (e.g., "Miss Fortune" -> "MissFortune")
function formatChampionId(name) {
    return name
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
}

// Fetch LoL champion data
async function fetchChampionData(champion) {
    const url = `https://ddragon.leagueoflegends.com/cdn/${patchVersion}/data/en_US/champion/${champion}.json`;
    const response = await fetch(url);
    const data = await response.json();
    return data.data[champion];
}

// Match skin by name (case insensitive + trimmed)
function findSkinNumber(championData, skinName) {
    return (
        championData.skins.find(
            s => s.name.trim().toLowerCase() === skinName.trim().toLowerCase()
        )?.num || 0
    );
}

// Construct splash art image URL
function buildSplashUrl(champion, skinNum) {
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion}_${skinNum}.jpg`;
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

    // Inject into page
    document.getElementById("dateRange").textContent = formattedRange;

    const container = document.getElementById("cardContainer");
    const loading = document.getElementById("loadingSpinner");
    const skinData = await fetchSkinData();

    loading.style.display = "block";

    for (const skin of skinData) {
        try {
            const champId = formatChampionId(skin.champion);
            const champData = await fetchChampionData(champId);
            const skinNum = findSkinNumber(champData, skin.skin);
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
            console.error(`Error fetching data for ${skin.champion}:`, error);
        } finally {
            loading.style.display = "none";
        }
    }
}

// Start rendering on load
renderSkins();

// Fullscreen images on click
document.addEventListener('DOMContentLoaded', () => {
    // Delegate click event to images inside skin cards
    document.getElementById('cardContainer').addEventListener('click', (event) => {
        if (event.target.classList.contains('splash-img')) {
            openFullscreen(event.target.src, event.target.alt);
        }
    });

    function openFullscreen(imgSrc, altText) {
        // Create overlay element
        const overlay = document.createElement('div');
        overlay.classList.add('fullscreen-overlay');

        // Create fullscreen image
        const fullscreenImg = document.createElement('img');
        fullscreenImg.src = imgSrc;
        fullscreenImg.alt = altText || '';

        overlay.appendChild(fullscreenImg);
        document.body.appendChild(overlay);

        // Close fullscreen on clicking overlay (but NOT on clicking the image)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        // Optional: close on pressing ESC key
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
