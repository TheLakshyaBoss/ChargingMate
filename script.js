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

  map.on("click", (e) => {
    console.log("Clicked coords:", e.latlng.lat, e.latlng.lng);
  });

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userCoords = [pos.coords.latitude, pos.coords.longitude];

      // ✅ ONLY user has marker
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

// 🔋 LOAD CHARGERS
async function loadChargers() {
  const { data } = await window.db.from("chargers").select("*");

  chargerMarkers.forEach(m => map.removeLayer(m));
  chargerMarkers = [];

  data.forEach(c => {
    const marker = L.marker([c.lat, c.lng], {
      icon: createBatteryIcon()
    }).addTo(map);

    marker.bindPopup(`
    <b>${c.name}</b><br/>
    <button class="map-btn" onclick="startNavigation([${c.lat}, ${c.lng}], '${c.name}')">Navigate</button>
    <button class="map-btn secondary" onclick="openBookingModal('${c.id}', '${c.owner_id}')">Book</button>
  `);

    chargerMarkers.push(marker);
  });
}


// 🚗 REAL ROAD ROUTE (OSRM)
async function drawRoute(destCoords) {
  if (routeLine) {
    map.removeLayer(routeLine);
  }

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


// 📡 BOOK
async function book(chargerId) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  await window.db.from("bookings").insert([
    {
      charger_id: chargerId,
      user_id: user.id
    }
  ]);

  showToast("Booking sent ⚡");
}


// 🔔 TOAST
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;

  document.body.appendChild(t);

  setTimeout(() => t.remove(), 2000);
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
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) *
    Math.cos(lat1) * Math.cos(lat2);

  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}


let selectedChargerId = null;
let selectedSlot = null;
let selectedPrice = 0;
let selectedOwnerId = null;

// 🔥 OPEN BOOKING MODAL
function openBookingModal(chargerId) {
  selectedChargerId = chargerId;
  selectedOwnerId = ownerId;

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "bookingModal";

  modal.innerHTML = `
    <div class="modal-box">
      <h3>Select Slot</h3>

      <div class="slot-container" id="slotContainer"></div>

      <div class="price">₹ <span id="price">0</span></div>

      <button id="confirmBooking">Book</button>
    </div>
  `;

  document.body.appendChild(modal);

  generateSlots();

  document.getElementById("confirmBooking").onclick = confirmBooking;
}


// 🔥 SLOT GENERATOR (clean + creative)
function generateSlots() {
  const container = document.getElementById("slotContainer");

  const now = new Date();

  for (let i = 1; i <= 6; i++) {
    const time = new Date(now.getTime() + i * 30 * 60000);

    const label = time.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    const price = 20 + i * 5;

    const div = document.createElement("div");
    div.className = "slot";
    div.innerText = `${label} • ₹${price}`;

    div.onclick = () => {
      document.querySelectorAll(".slot").forEach(s => s.classList.remove("active"));
      div.classList.add("active");

      selectedSlot = label;
      selectedPrice = price;

      document.getElementById("price").innerText = price;
    };

    container.appendChild(div);
  }
}


// 🔥 CONFIRM BOOKING
async function confirmBooking() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!selectedSlot) return showToast("Select a slot");

  await window.db.from("bookings").insert([{
    charger_id: selectedChargerId,
    user_id: user.id,
    owner_id: selectedOwnerId,
    slot: selectedSlot,
    price: selectedPrice,
    status: "pending"
  }]);

  document.getElementById("bookingModal").remove();

  showToast("Request sent ⚡");
}


// 🔥 REALTIME LISTENER (USER)
window.db.channel("user-booking")
  .on("postgres_changes", {
    event: "UPDATE",
    schema: "public",
    table: "bookings"
  }, (payload) => {

    const booking = payload.new;
    const user = JSON.parse(localStorage.getItem("user"));

    if (booking.user_id !== user.id) return;

    if (booking.status === "accepted") {
      showSuccess();
    }

    if (booking.status === "rejected") {
      showReject();
    }
  })
  .subscribe();


// 🎉 SUCCESS
function showSuccess() {
  const div = document.createElement("div");
  div.className = "modal";

  div.innerHTML = `
    <div class="modal-box">
      <h3>Booking Confirmed 🎉</h3>
      <button onclick="this.parentElement.parentElement.remove()">OK</button>
    </div>
  `;

  document.body.appendChild(div);
}


// ❌ REJECT
function showReject() {
  const div = document.createElement("div");
  div.className = "modal";

  div.innerHTML = `
    <div class="modal-box">
      <h3>Request Rejected</h3>
      <button onclick="this.parentElement.parentElement.remove()">OK</button>
    </div>
  `;

  document.body.appendChild(div);
}

initRealtime();

function initRealtime() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  window.db
    .channel("global-bookings")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings"
      },
      async (payload) => {
        const booking = payload.new;

        // 🔥 HOST VIEW
        const { data: charger } = await window.db
          .from("chargers")
          .select("*")
          .eq("id", booking.charger_id)
          .single();

        if (booking.owner_id === user.id && booking.status === "pending") {
          showHostPopup(booking);
        }

        // 🔥 USER VIEW
        if (booking.user_id === user.id && payload.eventType === "UPDATE") {
          if (booking.status === "accepted") showSuccess();
          if (booking.status === "rejected") showReject();
        }
      }
    )
    .subscribe((status) => {
      console.log("Realtime status:", status);
    });
}