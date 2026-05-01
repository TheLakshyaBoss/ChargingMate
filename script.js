let map;
let userCoords;
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

function createBatteryIcon() {
  return L.divIcon({
    className: "custom-battery-icon",
    html: `<i class="fa-solid fa-battery-full"></i>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

// ⭐ FONT AWESOME STARS
function getStarsHTML(rating) {
  let html = "";

  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      // full star
      html += `<i class="fa-solid fa-star" style="color:gold;"></i>`;
    } else if (rating >= i - 0.5) {
      // half star
      html += `<i class="fa-solid fa-star-half-stroke" style="color:gold;"></i>`;
    } else {
      // empty star
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
    
    const marker = L.marker([c.lat, c.lng], {
      icon: createBatteryIcon()
    }).addTo(map);

    marker.bindPopup(`
      <b>${c.name}</b><br/>
      <div style="margin:5px 0;">
        ${getStarsHTML(rating)} (${rating}/5)
      </div>

      <button class="map-btn" onclick="startNavigation([${c.lat}, ${c.lng}], '${c.name}')">Navigate</button>
      <button class="map-btn secondary" onclick="openBookingModal('${c.id}', '${c.owner_id}')">Book</button>
    `);

    chargerMarkers.push(marker);
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

  document.getElementById("infoBar").style.display = "flex";
  drawRoute(destCoords);
  updateInfo(destCoords, name);
}

function stopNavigation() {
  document.getElementById("infoBar").style.display = "none";
  if (routeLine) map.removeLayer(routeLine);
}


// 🔔 TOAST
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
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


let selectedChargerId = null;
let selectedOwnerId = null;


// 🔥 OPEN BOOKING MODAL (UPGRADED UI)
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
        <input type="time" id="timeInput" style="flex:1; padding:10px;" />
        
        <select id="ampm" style="padding:10px;">
          <option>AM</option>
          <option>PM</option>
        </select>
      </div>

      <div id="timePreview" style="margin-top:10px; font-size:14px;"></div>
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


// ⏰ UPDATE TIME UI
function updateTimeUI() {
  const time = document.getElementById("timeInput").value;
  const ampm = document.getElementById("ampm").value;

  if (!time) return;

  let [hours, minutes] = time.split(":").map(Number);

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const now = new Date();
  const selected = new Date();

  selected.setHours(hours);
  selected.setMinutes(minutes);
  selected.setSeconds(0);

  const diffMs = selected - now;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  const formatted = selected.toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  document.getElementById("timePreview").innerText = formatted;
  document.getElementById("timeDiff").innerText =
    diffHours > 0 ? `${diffHours} hours from now` : "Time passed";
}


// 🔥 CONFIRM BOOKING
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