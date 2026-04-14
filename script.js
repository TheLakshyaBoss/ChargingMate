// Initialize map
const map = L.map('map').setView([23.0225, 72.5714], 13); // default (will update)

// Load OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Get user location
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;

    map.setView([latitude, longitude], 14);

    // User marker
    L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup("📍 You are here")
      .openPopup();

    // Load chargers
    loadChargers(latitude, longitude);
  },
  () => {
    alert("Location access denied");
  }
);

// Dummy charger data (replace with Supabase later)
const chargers = [
  { name: "Raj's Charger", lat: 23.025, lng: 72.57, status: "available" },
  { name: "Amit's Home", lat: 23.02, lng: 72.575, status: "busy" },
  { name: "Neha Station", lat: 23.018, lng: 72.568, status: "offline" },
];

// Load chargers on map
function loadChargers(userLat, userLng) {
  chargers.forEach((c) => {
    const color = getColor(c.status);

    const marker = L.circleMarker([c.lat, c.lng], {
      radius: 10,
      color: color,
      fillColor: color,
      fillOpacity: 0.8,
    }).addTo(map);

    const distance = getDistance(userLat, userLng, c.lat, c.lng);

    marker.bindPopup(`
      <b>${c.name}</b><br/>
      Status: ${c.status}<br/>
      Distance: ${distance} km<br/>
      <button class="btn" onclick="reserveSlot('${c.name}')">Reserve</button>
    `);
  });
}

// Status color
function getColor(status) {
  if (status === "available") return "green";
  if (status === "busy") return "yellow";
  return "red";
}

// Fake reserve
function reserveSlot(name) {
  alert(`⚡ Slot reserved at ${name}`);
}

// Distance calc (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}