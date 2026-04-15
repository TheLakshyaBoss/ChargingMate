let map;
let userCoords;
let isNavigating = false;
let routeLine = null;
let chargerMarkers = [];

document.addEventListener("DOMContentLoaded", () => {
  initMap();
});

function initMap() {
  map = L.map("map").setView([23.02, 72.57], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  map.on("click", handleMapClick);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userCoords = [pos.coords.latitude, pos.coords.longitude];

      L.marker(userCoords).addTo(map).bindPopup("You");
      map.setView(userCoords, 14);

      loadChargers();
    },
    () => {
      showToast("Location not available");
      loadChargers();
    }
  );
}

function handleMapClick(e) {
  const { lat, lng } = e.latlng;
  console.log("Clicked coords:", lat, lng);
}

function startNavigation(destCoords, name) {
  if (!userCoords) return;

  isNavigating = true;

  document.getElementById("infoBar").style.display = "flex";

  drawRoute(destCoords);
  updateInfo(destCoords, name);
}

function stopNavigation() {
  isNavigating = false;

  document.getElementById("infoBar").style.display = "none";

  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
}

function drawRoute(destCoords) {
  if (routeLine) {
    map.removeLayer(routeLine);
  }

  routeLine = L.polyline([userCoords, destCoords], {
    weight: 4,
    opacity: 0.6
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}

async function loadChargers() {
  try {
    const { data, error } = await window.db.from("chargers").select("*");

    if (error || !data) return;

    chargerMarkers.forEach(m => map.removeLayer(m));
    chargerMarkers = [];

    data.forEach(c => {
      const marker = L.marker([c.lat, c.lng]).addTo(map);

      marker.bindPopup(`
        <b>${c.name}</b><br/>
        <button onclick="startNavigation([${c.lat}, ${c.lng}], '${c.name}')">
          Navigate
        </button>
        <br/>
        <button onclick="book('${c.id}')">
          Book
        </button>
      `);

      chargerMarkers.push(marker);
    });

  } catch {
    showToast("Failed to load chargers");
  }
}

async function book(chargerId) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  try {
    await window.db.from("bookings").insert([
      {
        charger_id: chargerId,
        user_id: user.id
      }
    ]);

    showToast("Booking sent ⚡");

  } catch {
    showToast("Booking failed");
  }
}

function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;

  document.body.appendChild(t);

  setTimeout(() => t.remove(), 2000);
}

async function getNiceAddress(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );

    const data = await res.json();

    return (
      data.address?.road ||
      data.address?.neighbourhood ||
      data.address?.suburb ||
      data.address?.village ||
      data.address?.town ||
      data.display_name?.split(",")[0] ||
      "Selected Location"
    );
  } catch {
    return "Selected Location";
  }
}

async function updateInfo(destCoords, nameFallback) {
  if (!userCoords) return;

  const [lat, lng] = destCoords;

  const address = await getNiceAddress(lat, lng);

  document.getElementById("placeName").innerText =
    address || nameFallback;

  const dist = getDistance(userCoords, destCoords);

  document.getElementById("distance").innerText =
    dist.toFixed(2) + " km";
}

function getDistance(a, b) {
  const R = 6371;

  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;

  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) *
    Math.cos(lat1) * Math.cos(lat2);

  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}