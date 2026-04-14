document.addEventListener("DOMContentLoaded", () => {
    
    const nav = document.createElement("div");
    nav.className = "bottom-nav";
    nav.innerHTML = `
        <a href="./index.html" class="nav-item">
        <i class="fa-solid fa-house"></i>
        <span>Home</span>
        </a>

        <a href="./host.html" class="nav-item">
        <i class="fa-solid fa-charging-station"></i>
        <span>Host</span>
        </a>
    `;

    document.body.appendChild(nav);

    const path = window.location.pathname;
    document.querySelectorAll(".nav-item").forEach(link => {
        if (path.includes(link.getAttribute("href"))) {
            link.classList.add("active");
        }
    });
});