let map;
let userCoords;
let isNavigating = false;
let routeLine = null;
let chargerMarkers = [];

const FULL_CHARGE_PRICE = 70;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
});

function initMap() {
  map = L.map("map").setView([23.02, 72.57], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  map.on("click", (e) => {
    console.log("Clicked coords:", e.latlng.lat, e.latlng.lng);
  });

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userCoords = [pos.coords.latitude, pos.coords.longitude];

      L.marker(userCoords).addTo(map).bindPopup("You");

      map.setView(userCoords, 14);
      loadChargers();
    },
    () => loadChargers()
  );
}

// 🔋 Bigger icon
function createBatteryIcon() {
  return L.divIcon({
    className: "custom-battery-icon",
    html: `<i class="fa-solid fa-battery-full" style="font-size:24px;"></i>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

// ⭐ STAR LOGIC
function getStarsHTML(rating) {
  let html = "";

  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      html += `<i class="fa-solid fa-star" style="color:gold;"></i>`;
    } else if (rating >= i - 0.5) {
      html += `<i class="fa-solid fa-star-half-stroke" style="color:gold;"></i>`;
    } else {
      html += `<i class="fa-regular fa-star" style="color:gold;"></i>`;
    }
  }

  return html;
}

// 🔋 LOAD CHARGERS
async function loadChargers() {
  const { data } = await window.db.from("chargers").select("*");

  chargerMarkers.forEach(m => map.removeLayer(m));
  chargerMarkers = [];

  data.forEach(c => {
    const rating = parseFloat(c.rating) || 0;

    // ✅ Glow circle (static, smooth)
    const glow = L.circle([c.lat, c.lng], {
      radius: 40,
      color: "#00ff88",
      fillColor: "#00ff88",
      fillOpacity: 0.25,
      weight: 0
    }).addTo(map);

    const marker = L.marker([c.lat, c.lng], {
      icon: createBatteryIcon()
    }).addTo(map);

    marker.bindPopup(`
      <b>${c.name}</b><br/>
      <div style="margin:5px 0;">
        ${getStarsHTML(rating)} (${rating.toFixed(1)}/5)
      </div>

      <button class="map-btn" onclick="startNavigation([${c.lat}, ${c.lng}], '${c.name}')">Navigate</button>
      <button class="map-btn secondary" onclick="openBookingModal('${c.id}', '${c.owner_id}')">Book</button>
    `);

    chargerMarkers.push(marker);
    chargerMarkers.push(glow); // keep track to clear later
  });
}


// 🚗 ROUTE
async function drawRoute(destCoords) {
  if (routeLine) map.removeLayer(routeLine);

  const url = `https://router.project-osrm.org/route/v1/driving/${userCoords[1]},${userCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();

  const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);

  routeLine = L.polyline(coords, {
    weight: 5,
    opacity: 0.7
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
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


// 📍 ADDRESS
async function getNiceAddress(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );

    const data = await res.json();

    return (
      data.address?.road ||
      data.address?.suburb ||
      data.address?.town ||
      data.display_name?.split(",")[0] ||
      "Selected Location"
    );
  } catch {
    return "Selected Location";
  }
}


// 📊 INFOBAR
async function updateInfo(destCoords, fallback) {
  const [lat, lng] = destCoords;

  const address = await getNiceAddress(lat, lng);
  document.getElementById("placeName").innerText = address || fallback;

  const dist = getDistance(userCoords, destCoords);
  document.getElementById("distance").innerText = dist.toFixed(2) + " km";
}


// 📏 DISTANCE
function getDistance(a, b) {
  const R = 6371;

  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;

  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}


// 🔔 TOAST
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}


let selectedChargerId = null;
let selectedOwnerId = null;


// 🔥 MODAL (unchanged)
function openBookingModal(chargerId, ownerId) {
  selectedChargerId = chargerId;
  selectedOwnerId = ownerId;

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "bookingModal";

  modal.innerHTML = `
    <div class="modal-box">
      <h3>Select Time</h3>

      <div style="display:flex; gap:10px;">
        <input type="time" id="timeInput" style="flex:1; padding:10px; background:#222; color:white; border:none;" />
        
        <select id="ampm" style="padding:10px; background:#222; color:white; border:none;">
          <option>AM</option>
          <option>PM</option>
        </select>
      </div>

      <div id="timePreview" style="margin-top:10px;"></div>
      <div id="timeDiff" style="font-size:13px; color:gray;"></div>

      <div class="price" style="margin-top:10px;">₹ ${FULL_CHARGE_PRICE}</div>

      <button id="confirmBooking">Book</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("timeInput").addEventListener("change", updateTimeUI);
  document.getElementById("ampm").addEventListener("change", updateTimeUI);

  document.getElementById("confirmBooking").onclick = confirmBooking;
}


// ⏰ TIME LOGIC (unchanged)
function updateTimeUI() {
  const time = document.getElementById("timeInput").value;
  const ampm = document.getElementById("ampm").value;

  if (!time) return;

  let [hours, minutes] = time.split(":").map(Number);

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const now = new Date();
  const selected = new Date();

  selected.setHours(hours, minutes, 0);

  if (selected <= now) {
    selected.setDate(selected.getDate() + 1);
  }

  const diffMs = selected - now;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;

  const formatted = selected.toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  document.getElementById("timePreview").innerText = formatted;

  if (h === 0 && m > 0) {
    document.getElementById("timeDiff").innerText = `in ${m} min`;
  } else {
    document.getElementById("timeDiff").innerText = `in ${h} hr ${m} min`;
  }
}


// 🔥 CONFIRM (unchanged)
async function confirmBooking() {
  const user = JSON.parse(localStorage.getItem("user"));
  const time = document.getElementById("timeInput").value;
  const ampm = document.getElementById("ampm").value;

  if (!time) return showToast("Select time");

  await window.db.from("bookings").insert([{
    charger_id: selectedChargerId,
    user_id: user.id,
    owner_id: selectedOwnerId,
    slot: `${time} ${ampm}`,
    price: FULL_CHARGE_PRICE,
    status: "pending"
  }]);

  document.getElementById("bookingModal").remove();
  showToast("Request sent ⚡");
}