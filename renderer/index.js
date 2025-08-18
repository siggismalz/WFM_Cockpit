document.addEventListener("DOMContentLoaded", () => {
  const tooltipliste = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  [...tooltipliste].forEach(el => new bootstrap.Tooltip(el));
  username_holen();
  tool_cards_laden();

  const form = document.getElementById("toolForm");
  const modalEl = document.getElementById("toolModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const errorBox = document.getElementById("toolFormError");

  // Modal resetten, wenn es geschlossen wird
  modalEl.addEventListener("hidden.bs.modal", () => {
    form.reset();
    form.classList.remove("was-validated");
    errorBox.classList.add("d-none");
    errorBox.textContent = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    form.classList.add("was-validated");
    errorBox.classList.add("d-none");

    if (!form.checkValidity()) return;

    const daten = {
      toolname: document.getElementById("toolname").value.trim(),
      toolbeschreibung: document.getElementById("toolbeschreibung").value.trim(),
      toolpfad: document.getElementById("toolpfad").value.trim(),
      toolart: document.getElementById("toolart").value.trim()
    };

    try {
      if (window.electron?.tool_speichern) {
        const res = await window.electron.tool_speichern(daten);
        if (res?.ok) {
          modal.hide();
          tool_cards_laden();
            const Toast = Swal.mixin({
            toast: true,
            position: "bottom-end",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.onmouseenter = Swal.stopTimer;
              toast.onmouseleave = Swal.resumeTimer;
            }
          });
          Toast.fire({
            icon: "success",
            title: "Tool erfolgreich hinzugefügt"
          });
          return;
        }
        throw new Error(res?.message || "Unbekannter Fehler beim Speichern");
      } else {
        modal.hide();
      }
    } catch (err) {
      errorBox.textContent = err.message || String(err);
      errorBox.classList.remove("d-none");
    }
  });
});

document.getElementById("btn_gh_dispo_tools").addEventListener("click",() => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("GH_Dispo");
});

document.getElementById("btn_sonderprozesse").addEventListener("click",() => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("Sonderprozesse");
});

document.getElementById("btn_organisation").addEventListener("click",() => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("Organisation");
});

document.getElementById("btn_Auswertungen").addEventListener("click",() => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("Auswertungen");
});

document.getElementById("btn_mail").addEventListener("click",() => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("Mailing");
});

document.getElementById("btn_suche").addEventListener("click",() => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  const filter = document.getElementById("T_suche").value;
  tools_dursuchen(filter)
});

function tool_offnen(id) {
  window.electron.tool_oeffnen(id);
};

async function username_holen(){
  let username = await window.electron.username();
  document.getElementById("username").innerText = username;
};

async function tool_cards_laden(filter){
  let daten = await window.electron.tools_laden(filter);
  if (!Array.isArray(daten) || daten.length === 0) return;

  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  daten.forEach((tool, index) => {
const cardHTML = `
  <div class="card tool-card shadow-sm appear" onclick="tool_offnen('${tool.id}')">
    <div class="tool-accent"></div>
    <div class="card-body">
      <h6 class="tool-title mb-1">${tool.toolname}</h6>
      <p class="tool-desc mb-0">${tool.toolbeschreibung}</p>
    </div>

    <div class="card-footer bg-transparent">
      <div class="tool-meta text-muted small"></div>
      <button class="btn btn-light tool-open-btn" 
              onclick="event.stopPropagation(); tool_offnen('${tool.id}')"
              aria-label="Öffnen">
        <i class="bi bi-arrow-up-right"></i>
      </button>
    </div>
  </div>
`;
    setTimeout(() => {
      // Robust einfügen und Element referenzieren
      const tpl = document.createElement("template");
      tpl.innerHTML = cardHTML.trim();
      const el = tpl.content.firstElementChild;

      // Einmalige Entry-Animation aktivieren
      el.classList.add("appear");
      grid.appendChild(el);

      // Nach Ende der Animation Klasse entfernen -> Hover funktioniert
      el.addEventListener("animationend", () => {
        el.classList.remove("appear");
      }, { once: true });
    }, index * 100); // Staffelung (optional)
  });
};

async function tools_dursuchen(filter){
  let daten = await window.electron.tools_dursuchen(filter);
  if (!Array.isArray(daten) || daten.length === 0) return;

  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  daten.forEach((tool, index) => {
const cardHTML = `
  <div class="card tool-card shadow-sm appear" onclick="tool_offnen('${tool.id}')">
    <div class="tool-accent"></div>
    <div class="card-body">
      <h6 class="tool-title mb-1">${tool.toolname}</h6>
      <p class="tool-desc mb-0">${tool.toolbeschreibung}</p>
    </div>

    <div class="card-footer bg-transparent">
      <div class="tool-meta text-muted small"></div>
      <button class="btn btn-light tool-open-btn" 
              onclick="event.stopPropagation(); tool_offnen('${tool.id}')"
              aria-label="Öffnen">
        <i class="bi bi-arrow-up-right"></i>
      </button>
    </div>
  </div>
`;
    setTimeout(() => {
      // Robust einfügen und Element referenzieren
      const tpl = document.createElement("template");
      tpl.innerHTML = cardHTML.trim();
      const el = tpl.content.firstElementChild;

      // Einmalige Entry-Animation aktivieren
      el.classList.add("appear");
      grid.appendChild(el);

      // Nach Ende der Animation Klasse entfernen -> Hover funktioniert
      el.addEventListener("animationend", () => {
        el.classList.remove("appear");
      }, { once: true });
    }, index * 100); // Staffelung (optional)
  });
};

async function speicher_bereinigen(){
  await window.electron.tools_ordner_leeren();
  const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});
Toast.fire({
  icon: "success",
  title: "Speicher erfolgreich bereinigt"
});
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function abmelden(){
  const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});
Toast.fire({
  icon: "info",
  title: "Du wirst nun abgemeldet"
});
  
  await wait(4000);

  window.electron.abmelden();
};

async function sap_verbindung_test(){
  const ergebnis = window.electron.sap_verbindung_testen();

  if (ergebnis.success) {
  const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});
Toast.fire({
  icon: "success",
  title: "SAP-Verbindung erfolgreich hergestellt"
});
  

} else {
  const Toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});
Toast.fire({
  icon: "error",
  title: "Keine Verbindung zu SAP möglich"
});
  }
};