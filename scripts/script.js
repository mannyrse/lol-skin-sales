const patchVersion = "16.1.1";

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
        window._championFull = data.data;
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

// Construct splash art image URL
function buildSplashUrl(championId, skinNum) {
    const specialCases = {
        Fiddlesticks: "FiddleSticks",
    };
    const realId = specialCases[championId] || championId;
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${realId}_${skinNum}.jpg`;
}

// Build a skin card element from a resolved skin entry
function buildSkinCard(skin) {
    const card = document.createElement("div");
    card.className = "skin-card";
    card.dataset.skinId = skin.id;
    card.innerHTML = `
        <div class="discount-badge">${skin.discount}% OFF</div>
        <div class="card-img-wrap">
            <img class="splash-img" loading="lazy" src="${skin.splashUrl}" alt="${skin.skin}">
        </div>
        <div class="card-body">
            <p class="champion-name">${skin.champion}</p>
            <h3>${skin.skin}</h3>
            <div class="card-footer">
                <span class="price-tag">
                    <img class="rp-icon" src="images/RP_icon.png" alt="RP"><strong>${skin.price} RP</strong>
                </span>
                <a href="${skin.spotlight}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style="flex-shrink:0"><polygon points="1,0 10,5 1,10"/></svg> Spotlight</a>
            </div>
        </div>
    `;
    return card;
}

// Create a filler card
function createBrandCard() {
    const card = document.createElement("div");
    card.className = "skin-card brand-card";
    card.innerHTML = `
        <div class="brand-card-inner">
            <div class="brand-card-logo">
                <img src="images/RP_icon.png" alt="RP" class="brand-rp-icon">
            </div>
            <p class="brand-card-title">LoL Skin Sale</p>
            <p class="brand-card-sub">Weekly skin discounts,<br>refreshed every Monday.</p>
            <p class="brand-card-back">Back to top</p>
        </div>
    `;
    card.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return card;
}

// Calculate how many columns the grid currently has (mirrors CSS breakpoints)
function getColumnCount() {
    const w = window.innerWidth;
    if (w <= 480) return 1;
    if (w <= 768) return 2;
    return 3;
}

function updateFillerCards(container, skinCount) {
    container.querySelectorAll(".brand-card").forEach(c => c.remove());

    const cols = getColumnCount();
    if (cols <= 1) return;

    const remainder = skinCount % cols;
    if (remainder === 0) return;

    const fillersNeeded = cols - remainder;
    for (let i = 0; i < fillersNeeded; i++) {
        container.appendChild(createBrandCard());
    }
}

// Sort a copy of the resolved skin data by the given sort key
function sortSkins(skins, sortKey) {
    const sorted = [...skins];
    if (sortKey === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sortKey === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sortKey === "discount-desc") sorted.sort((a, b) => b.discount - a.discount);
    // "default" keeps original order
    return sorted;
}

// Re-render cards in the chosen sort order by reordering DOM nodes (no image reload)
function renderSorted(container, resolvedSkins, sortKey) {
    // Remove only filler cards
    container.querySelectorAll(".brand-card").forEach(c => c.remove());

    const sorted = sortSkins(resolvedSkins, sortKey);

    // Reorder existing skin card nodes by matching data-skin-id
    sorted.forEach(skin => {
        const el = container.querySelector(`.skin-card[data-skin-id="${skin.id}"]`);
        if (el) container.appendChild(el);
    });

    updateFillerCards(container, sorted.length);
}

// Render all skins to the page
async function renderSkins() {
    const weekZero = new Date(2025, 10, 3);
    const today = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksPassed = Math.floor((today - weekZero) / msPerWeek);
    const currentWeekStart = new Date(weekZero.getTime() + weeksPassed * msPerWeek);
    const currentWeekEnd = new Date(currentWeekStart.getTime() + msPerWeek);
    const options = { year: "numeric", month: "long", day: "numeric" };
    const formattedRange = `${currentWeekStart.toLocaleDateString("en-US", options)} – ${currentWeekEnd.toLocaleDateString("en-US", options)}`;

    document.getElementById("dateRange").textContent = formattedRange;

    const container = document.getElementById("cardContainer");
    const loading = document.getElementById("loadingSpinner");
    const skinData = await fetchSkinData();

    // Compare sheet date to current week start and update sale info text
    const saleInfo = document.querySelector('.sale-info p');
    if (saleInfo) {
        const sheetDate = skinData[0]?.week;
        const sheetWeekStart = new Date(sheetDate);
        const isCurrent = sheetWeekStart.toDateString() === currentWeekStart.toDateString();

        if (!isCurrent) {
            saleInfo.textContent = "New skin sales drop today at 12PM PT - check back later for this week's updated selection!";
        } else {
            saleInfo.textContent = "This week's discounts are up to date - sales refresh every Monday at 12PM PT.";
        }
    }

    loading.style.display = "block";

    // Resolve all skin data up front before rendering anything
    const resolvedSkins = [];

    for (const skin of skinData) {
        try {
            const champId = await getChampionId(skin.champion);
            if (!champId) {
                console.error(`Champion not found: ${skin.champion}`);
                continue;
            }
            const skinNum = await findSkinNumber(champId, skin.skin);
            const splashUrl = buildSplashUrl(champId, skinNum);
            resolvedSkins.push({ ...skin, splashUrl, id: `skin-${resolvedSkins.length}` });
        } catch (error) {
            console.error(`Error resolving skin for ${skin.champion}:`, error);
        }
    }

    loading.style.display = "none";

    // Initial render in default order
    resolvedSkins.forEach(skin => container.appendChild(buildSkinCard(skin)));
    updateFillerCards(container, resolvedSkins.length);

    // Filter dropdown behaviour
    const filterDropdown = document.getElementById("filterDropdown");
    const filterDropdownBtn = document.getElementById("filterDropdownBtn");
    const filterLabel = document.getElementById("filterLabel");
    const filterOptions = document.querySelectorAll(".filter-option");

    filterDropdownBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle("open");
    });

    document.addEventListener("click", () => filterDropdown.classList.remove("open"));

    filterOptions.forEach(btn => {
        btn.addEventListener("click", () => {
            filterOptions.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            filterLabel.textContent = `Sort: ${btn.textContent}`;
            filterDropdown.classList.remove("open");
            renderSorted(container, resolvedSkins, btn.dataset.sort);
        });
    });

    // Re-evaluate filler cards on resize
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const activeSort = document.querySelector(".filter-option.active")?.dataset.sort || "default";
            renderSorted(container, resolvedSkins, activeSort);
        }, 150);
    });
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