let map = L.map('map').setView([23.0225, 72.5714], 13);

// Map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

let userLat, userLng;
let markers = [];
let routeLine;
let animationInterval;

let chargers = JSON.parse(localStorage.getItem("chargers")) || [];

// Get location
navigator.geolocation.getCurrentPosition((pos) => {
  userLat = pos.coords.latitude;
  userLng = pos.coords.longitude;

  map.setView([userLat, userLng], 14);

  L.marker([userLat, userLng]).addTo(map)
    .bindPopup("📍 You");

  renderChargers();
});

// 🔋 Battery icon (BIG + colored)
function getIcon(status = "available") {
  let color = "#22c55e";

  if (status === "busy") color = "#facc15";
  if (status === "offline") color = "#ef4444";

  return L.divIcon({
    html: `<i class="fa-solid fa-battery-full charger-icon" style="color:${color}"></i>`,
    className: "",
    iconSize: [40, 40]
  });
}

// Render
function renderChargers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  chargers.forEach(c => {
    let marker = L.marker([c.lat, c.lng], {
      icon: getIcon(c.status)
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
    lng: e.latlng.lng,
    status: "available"
  });

  localStorage.setItem("chargers", JSON.stringify(chargers));

  adding = false;
  renderChargers();
});

// Nearest
function highlightNearest() {
  if (!userLat || chargers.length === 0) return;

  let nearest = chargers[0];
  let minDist = getDistance(userLat, userLng, nearest.lat, nearest.lng);

  chargers.forEach(c => {
    let d = getDistance(userLat, userLng, c.lat, c.lng);
    if (d < minDist) {
      minDist = d;
      nearest = c;
    }
  });

  drawRoute(nearest.lat, nearest.lng);
}

// 🛣️ ROUTE FIXED
let routingControl;

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
        lineOptions: {
            styles: [
                { color: '#3b82f6', weight: 6, opacity: 0.9 },  // main line
                { color: '#60a5fa', weight: 10, opacity: 0.2 }  // glow effect 🔥
            ]
        }
    }).addTo(map);

  
    routingControl.on('routesfound', function(e) {
        const route = e.routes[0];

        const distance = (route.summary.totalDistance / 1000).toFixed(2);

        document.getElementById("distance").innerText = `${distance} km`;
    });
}

// Animation
function animateRoute(latlngs) {
  let i = 0;

  routeLine = L.polyline([], {
    color: "#3b82f6",
    weight: 4,
    opacity: 0.6
  }).addTo(map);

  animationInterval = setInterval(() => {
    if (i >= latlngs.length) {
      clearInterval(animationInterval);
      return;
    }

    routeLine.addLatLng(latlngs[i]);
    i++;
  }, 8);
}

// Navigate
function navigateTo(lat, lng, name) {
  drawRoute(lat, lng);

//   document.getElementById("placeName").innerText = name;
  getAddress(lat, lng);
}

async function getAddress(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  );

  const data = await res.json();

  const addr = data.address;

    const niceAddress = [
        addr.suburb,
        addr.city,
        addr.state
    ].filter(Boolean).join(", ");

  document.getElementById("placeName").innerText = niceAddress;
}

// Distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2)**2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}