const API_URL = "http://localhost:3000";
const TOTAL_SEATS = 30;

const seatGrid = document.getElementById("seatGrid");
const logList = document.getElementById("logList");
const userIdInput = document.getElementById("userId");

// Estado local: quién bloqueó cada asiento (según lo que sabemos por respuestas)
const seatState = {};

function log(message, isError = false) {
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
  li.className = isError ? "error" : "ok";
  logList.prepend(li);
}

function renderSeats() {
  seatGrid.innerHTML = "";
  for (let i = 1; i <= TOTAL_SEATS; i++) {
    const seatId = String(i);
    const div = document.createElement("div");
    div.className = "seat";
    div.textContent = seatId;

    const owner = seatState[seatId];
    if (owner) {
      div.classList.add(owner === userIdInput.value ? "mio" : "bloqueado");
    }

    div.addEventListener("click", () => handleSeatClick(seatId));
    seatGrid.appendChild(div);
  }
}

async function handleSeatClick(seatId) {
  const userId = userIdInput.value.trim();
  if (!userId) {
    log("Escribe tu usuario antes de reservar", true);
    return;
  }

  const currentOwner = seatState[seatId];

  try {
    if (currentOwner === userId) {
      // Ya es mío -> lo libero
      const res = await fetch(`${API_URL}/reservas/${seatId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();

      if (res.ok) {
        delete seatState[seatId];
        log(`Asiento ${seatId} liberado`);
      } else {
        log(`No se pudo liberar el asiento ${seatId}: ${data.message || data.error}`, true);
      }
    } else {
      // Intento bloquear
      const res = await fetch(`${API_URL}/reservas/${seatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();

      if (res.status === 200) {
        seatState[seatId] = userId;
        log(`Asiento ${seatId} bloqueado por ${userId} (10s para confirmar)`);
      } else if (res.status === 409) {
        log(`Asiento ${seatId} ya está bloqueado por otro usuario`, true);
      } else if (res.status === 429) {
        log(`Demasiadas peticiones, espera un momento`, true);
      } else {
        log(`Error: ${data.error || "desconocido"}`, true);
      }
    }
  } catch (err) {
    log(`No se pudo conectar con el servidor: ${err.message}`, true);
  }

  renderSeats();
}

renderSeats();
