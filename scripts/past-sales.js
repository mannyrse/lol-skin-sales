// fetch previous skin data from Sheet2
async function fetchPreviousSkinData() {
    const response = await fetch("https://script.google.com/macros/s/AKfycbxqlNW0mNo7FsGo0hR2_2jwJ_WAxC1HiJoKB92Sfupv_1llL1vz04DKRivr-vxPtpQwvQ/exec?sheet=Previous%20Skin%20Sales");
    const data = await response.json();
    return data;
}

// format date to "Month Day, Year"
function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const rowsPerPage = 30;
let currentPage = 1;
let currentFilteredSkins = [];


// render table rows
function renderTableRows(skins, page = 1) {
    currentFilteredSkins = skins; // store filtered results for pagination
    tableBody = document.querySelector("#skinTable tbody");
    tableBody.innerHTML = ""; // clear existing rows

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageItems = skins.slice(start, end);

    pageItems.forEach(skin => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${formatDate(skin.week)}</td>
            <td>${skin.champion}</td>
            <td>${skin.skin}</td>
            <td>${skin.price} RP</td>
            <td>${skin.discount}%</td>
            <td><a href="${skin.spotlight}" target="_blank">View Spotlight</a></td>
        `;
        tableBody.appendChild(tr);
    });

    renderPaginationControls();
}

// render pagination controls
function renderPaginationControls() {
    const paginationContainer = document.getElementById("paginationControls");
    paginationContainer.innerHTML = "";

    const totalPages = Math.ceil(currentFilteredSkins.length / rowsPerPage);
    if (totalPages <= 1) return;

    const createButton = (page) => {
        const btn = document.createElement("button");
        btn.textContent = page;
        if (page === currentPage) btn.classList.add("active");
        btn.addEventListener("click", () => {
            currentPage = page;
            renderTableRows(currentFilteredSkins, currentPage);
        });
        return btn;
    };

    const createEllipsis = () => {
        const span = document.createElement("span");
        span.textContent = "...";
        span.style.padding = "0 6px";
        return span;
    };

    // Always show first page
    paginationContainer.appendChild(createButton(1));

    if (currentPage > 4) paginationContainer.appendChild(createEllipsis());

    // Show pages around current
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);

    for (let i = start; i <= end; i++) {
        paginationContainer.appendChild(createButton(i));
    }

    if (currentPage < totalPages - 3) paginationContainer.appendChild(createEllipsis());

    // Always show last page if more than 1
    if (totalPages > 1) paginationContainer.appendChild(createButton(totalPages));
}

// Populate week dropdown
function populateWeekDropdown(skins) {
    const weekSelect = document.getElementById("weekSelect");
    const uniqueWeeks = [...new Set(skins.map(s => s.week))].sort((a, b) => new Date(a) - new Date(b));

    uniqueWeeks.forEach(week => {
        const option = document.createElement("option");
        option.value = week;
        option.textContent = formatDate(week);
        weekSelect.appendChild(option);
    });
}

// filter skins by search and/or week
function filterSkins(skins, query, week) {
    const lowerQuery = query.toLowerCase();
    return skins.filter(skin => {
        const matchesSearch = skin.champion.toLowerCase().includes(lowerQuery) || skin.skin.toLowerCase().includes(lowerQuery);
        const matchesWeek = !week || skin.week === week;
        return matchesSearch && matchesWeek;
    });
}

// main function
async function initPreviousSkins() {
    const loading = document.getElementById("loadingSpinner");
    loading.style.display = "block";

    try {
        const skins = await fetchPreviousSkinData();

        // populate week dropdown
        populateWeekDropdown(skins);

        const searchInput = document.getElementById("searchInput");
        const searchButton = document.getElementById("searchButton");
        const resetButton = document.getElementById("resetButton");
        const weekSelect = document.getElementById("weekSelect");

        function applyFilters() {
            const query = searchInput.value.trim();
            const selectedWeek = weekSelect.value;
            const filtered = filterSkins(skins, query, selectedWeek);
            currentPage = 1; // reset to first page on filter change
            renderTableRows(filtered, currentPage);
        }


        searchButton.addEventListener("click", applyFilters);
        searchInput.addEventListener("keypress", e => { if (e.key === "Enter") applyFilters(); });
        resetButton.addEventListener("click", () => {
            searchInput.value = "";
            weekSelect.value = "";
            renderTableRows([]); // reset table to empty
        });
        weekSelect.addEventListener("change", applyFilters);

        // Default: table empty
        renderTableRows([]);

    } catch (err) {
        console.error("Error loading previous skins:", err);
    } finally {
        loading.style.display = "none";
    }
}

// Initialize
initPreviousSkins();
