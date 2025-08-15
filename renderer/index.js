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
  tool_cards_laden("gh_dispo");
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
      <div class="card shadow">
        <div class="card-body" style="height: 120px; overflow-y: auto;">
          <h6 class="card-title text-black mt-1">${tool.toolname}</h6>
          <p class="card-text mt-3">${tool.toolbeschreibung}</p>
        </div>
        <div class="container-fluid ms-0 ps-0 mt-4 card-footer bg-body">
          <button class="btn border-0" onclick="tool_offnen('${tool.id}')">Öffnen</button>
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
}
