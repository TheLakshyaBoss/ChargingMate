document.addEventListener("DOMContentLoaded", () => {
    
    const nav = document.createElement("div");
    nav.className = "bottom-nav";

    nav.innerHTML = `
        <a href="./index.html" class="nav-item" data-page="index">
            <i class="fa-solid fa-house"></i>
            <span>Home</span>
        </a>

        <a href="./host.html" class="nav-item" data-page="host">
            <i class="fa-solid fa-charging-station"></i>
            <span>Host</span>
        </a>
    `;

    document.body.appendChild(nav);

    // ✅ Get current page name
    let currentPage = window.location.pathname.split("/").pop();

    // Default to index if empty
    if (currentPage === "") currentPage = "index.html";

    // ✅ Highlight active tab
    document.querySelectorAll(".nav-item").forEach(link => {
        const page = link.getAttribute("href").replace("./", "");

        if (page === currentPage) {
            link.classList.add("active");
        }
    });
});