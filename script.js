let map;
let userCoords;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
});


function initMap() {
  map = L.map("map").setView([23.02, 72.57], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  navigator.geolocation.getCurrentPosition(pos => {
    userCoords = [pos.coords.latitude, pos.coords.longitude];

    L.marker(userCoords).addTo(map).bindPopup("You");
    map.setView(userCoords, 14);

    loadChargers();
  });
}


// 🔋 LOAD FROM SUPABASE
async function loadChargers() {
  const { data } = await window.db.from("chargers").select("*");

  data.forEach(c => {
    const marker = L.marker([c.lat, c.lng]).addTo(map);

    marker.bindPopup(`
      <b>${c.name}</b><br/>
      <button onclick="book('${c.id}')">Book</button>
    `);
  });
}


// 📡 BOOK
async function book(chargerId) {
  const user = JSON.parse(localStorage.getItem("user"));

  await window.db.from("bookings").insert([{
    charger_id: chargerId,
    user_id: user.id
  }]);

  showToast("Booking sent ⚡");
}


// 🔔 CLEAN TOAST
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;

  document.body.appendChild(t);

  setTimeout(() => t.remove(), 2000);
}