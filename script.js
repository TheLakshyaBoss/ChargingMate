let map = L.map('map').setView([23.0225, 72.5714], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

let userLat, userLng;
let markers = [];
let routingControl;

let chargers = JSON.parse(localStorage.getItem("chargers")) || [];

// User location (FIXED, not draggable)
navigator.geolocation.getCurrentPosition((pos) => {
  userLat = pos.coords.latitude;
  userLng = pos.coords.longitude;

  map.setView([userLat, userLng], 14);

  L.marker([userLat, userLng], {
    draggable: false
  }).addTo(map).bindPopup("📍 You");

  renderChargers();
});

// Icon
function getIcon() {
  return L.divIcon({
    html: `<i class="fa-solid fa-battery-full charger-icon" style="color:#22c55e"></i>`,
    className: "",
    iconSize: [40, 40]
  });
}

// Render chargers
function renderChargers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  chargers.forEach(c => {
    let marker = L.marker([c.lat, c.lng], {
      icon: getIcon()
    }).addTo(map);

    marker.bindPopup(`
      <b>${c.name}</b><br/>
      <button class="btn" onclick="navigateTo(${c.lat}, ${c.lng}, '${c.name}')">
        Navigate
      </button>
    `);

    markers.push(marker);
  });
}

// Add charger
let adding = false;

document.getElementById("addBtn").onclick = () => {
  adding = true;
  alert("Click on map to place charger");
};

map.on("click", (e) => {
  if (!adding) return;

  const name = prompt("Enter charger name:");
  if (!name) return;

  chargers.push({
    name,
    lat: e.latlng.lat,
    lng: e.latlng.lng
  });

  localStorage.setItem("chargers", JSON.stringify(chargers));

  adding = false;
  renderChargers();
});

// Navigate
function navigateTo(lat, lng, name) {
  drawRoute(lat, lng);
  getCleanAddress(lat, lng, name);
}

// Clean address
async function getCleanAddress(lat, lng, fallbackName) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );

    const data = await res.json();
    const addr = data.address;

    let place =
      addr.suburb ||
      addr.neighbourhood ||
      addr.village ||
      addr.road ||
      fallbackName;

    document.getElementById("placeName").innerText = place;

  } catch {
    document.getElementById("placeName").innerText = fallbackName;
  }
}

// Route
function drawRoute(lat, lng) {
  if (routingControl) {
    map.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(userLat, userLng),
      L.latLng(lat, lng)
    ],
    show: false,
    addWaypoints: false,
    createMarker: () => null,

    lineOptions: {
      styles: [
        { color: '#3b82f6', weight: 6, opacity: 0.9 },
        { color: '#60a5fa', weight: 10, opacity: 0.2 }
      ]
    }

  }).addTo(map);

  routingControl.on('routesfound', function(e) {
    const route = e.routes[0];
    const distance = (route.summary.totalDistance / 1000).toFixed(2);

    document.getElementById("distance").innerText = `${distance} km`;
  });
}