// ******************************************************** //
// Der Code im Event-Listener wird beim Appstart ausgeführt //
// ******************************************************** //

document.addEventListener("DOMContentLoaded", () => {

  // Tooltips der Buttons werden initialisiert
  const tooltipListe = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  [...tooltipListe].forEach(el => new bootstrap.Tooltip(el));

  // Username wird gesetzt
  username_holen();

  // Tools werden geladen
  tool_cards_laden();

  // Modal für's speichern/hinzufügen von neuen Tools
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
///////////////////////////////////////////////////////////////////////

// Filterung auf Tools im Bereich "GH_Dispo"
document.getElementById("btn_gh_dispo_tools").addEventListener("click", () => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("GH_Dispo");
});

// Filterung auf Tools im Bereich "Sonderprozesse"
document.getElementById("btn_sonderprozesse").addEventListener("click", () => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("Sonderprozesse");
});

// Filterung auf Tools im Bereich "Organisation"
document.getElementById("btn_organisation").addEventListener("click", () => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("Organisation");
});

// Filterung auf Tools im Bereich "Auswertungen"
document.getElementById("btn_Auswertungen").addEventListener("click", () => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("Auswertungen");
});

// Filterung auf Tools im Bereich "Mailing"
document.getElementById("btn_mail").addEventListener("click", () => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  tool_cards_laden("Mailing");
});

// Der Button der die Volltextsuche ausführt
document.getElementById("btn_suche").addEventListener("click", () => {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";
  const filter = document.getElementById("T_suche").value;
  tools_dursuchen(filter);
});

// Tool öffnen (direkt)
function tool_offnen(id) {
  window.electron.tool_oeffnen(id);
}

// Username abrufen
async function username_holen() {
  let username = await window.electron.username();
  document.getElementById("username").innerText = username;
}

/* ===================== Detail-Modal-Helfer ===================== */

const detailModalEl = document.getElementById('toolDetailModal');
const detailModal = detailModalEl ? new bootstrap.Modal(detailModalEl) : null;

function fillToolDetailModal(data) {
  document.getElementById('td_name').textContent = data.toolname || '';
  document.getElementById('td_beschreibung').textContent = data.toolbeschreibung || '';
  document.getElementById('td_pfad').textContent = data.toolpfad || '';
  document.getElementById('td_art').textContent = data.toolart || '';

  // Placeholder-Felder
  document.getElementById('td_version').textContent   = data.version   || '-';
  document.getElementById('td_entwickler').textContent= data.entwickler|| '-';
  document.getElementById('td_veroeff').textContent   = data.veroeff   || '-';
  document.getElementById('td_update').textContent    = data.update    || '-';

  // Buttons
  const btnOpen = document.getElementById('td_btn_open');
  const btnOpenDir = document.getElementById('td_btn_open_dir');

  btnOpen.onclick = () => {
    detailModal?.hide();
    tool_offnen(data.id);
  };

  btnOpenDir.onclick = async () => {
    try { await window.electron.dir_laden(data.id); } 
    catch (e) { console.error(e); }
  };
}


function readToolDataFromCard(cardEl) {
  return {
    id: cardEl.getAttribute('data-tool-id'),
    toolname: cardEl.getAttribute('data-tool-name') || cardEl.querySelector('.tool-title')?.textContent?.trim(),
    toolbeschreibung: cardEl.getAttribute('data-tool-desc') || cardEl.querySelector('.tool-desc')?.textContent?.trim(),
    toolpfad: cardEl.getAttribute('data-tool-path') || '',
    toolart: cardEl.getAttribute('data-tool-art') || ''
  };
}

/* ===================== Cards laden & Klick-Verhalten ===================== */

// Tools laden
async function tool_cards_laden(filter) {
  let daten = await window.electron.tools_laden(filter);
  if (!Array.isArray(daten) || daten.length === 0) {
    document.querySelector(".card-grid").innerHTML = "";
    return;
  }

  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  daten.forEach((tool, index) => {
    const cardHTML = `
      <div class="card tool-card shadow-sm"
           data-tool-id="${tool.id}"
           data-tool-name="${(tool.toolname ?? '').replaceAll('"','&quot;')}"
           data-tool-desc="${(tool.toolbeschreibung ?? '').replaceAll('"','&quot;')}"
           data-tool-path="${(tool.toolpfad ?? '').replaceAll('"','&quot;')}"
           data-tool-art="${(tool.toolart ?? '').replaceAll('"','&quot;')}"
           tabindex="0">
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
      const tpl = document.createElement("template");
      tpl.innerHTML = cardHTML.trim();
      const el = tpl.content.firstElementChild;

      // Entry-Animation
      el.classList.add("appear");
      grid.appendChild(el);
      el.addEventListener("animationend", () => {
        el.classList.remove("appear");
      }, { once: true });

      // Linksklick auf die Card -> Detail-Modal
      el.addEventListener('click', async () => {
        const data = readToolDataFromCard(el);
        // Optional: falls Pfad/Art fehlen, Details nachladen
        if ((!data.toolpfad || !data.toolart) && window.electron?.tool_details) {
          try {
            const more = await window.electron.tool_details(data.id);
            if (more) {
              data.toolpfad = data.toolpfad || more.toolpfad || '';
              data.toolart  = data.toolart  || more.toolart  || '';
            }
          } catch (e) { console.warn('tool_details fehlgeschlagen:', e); }
        }
        fillToolDetailModal(data);
        detailModal?.show();
      });

      // Tastatur: Enter/Space -> Detail-Modal
      el.addEventListener('keydown', async (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          const data = readToolDataFromCard(el);
          if ((!data.toolpfad || !data.toolart) && window.electron?.tool_details) {
            try {
              const more = await window.electron.tool_details(data.id);
              if (more) {
                data.toolpfad = data.toolpfad || more.toolpfad || '';
                data.toolart  = data.toolart  || more.toolart  || '';
              }
            } catch (e) { console.warn('tool_details fehlgeschlagen:', e); }
          }
          fillToolDetailModal(data);
          detailModal?.show();
        }
      });

    }, index * 100);
  });
}

// Funktione zum laden der Tools für die Volltextsuche
async function tools_dursuchen(filter) {
  let daten = await window.electron.tools_dursuchen(filter);
  if (!Array.isArray(daten) || daten.length === 0) {
    document.querySelector(".card-grid").innerHTML = "";
    return;
  }

  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  daten.forEach((tool, index) => {
    const cardHTML = `
      <div class="card tool-card shadow-sm"
           data-tool-id="${tool.id}"
           data-tool-name="${(tool.toolname ?? '').replaceAll('"','&quot;')}"
           data-tool-desc="${(tool.toolbeschreibung ?? '').replaceAll('"','&quot;')}"
           data-tool-path="${(tool.toolpfad ?? '').replaceAll('"','&quot;')}"
           data-tool-art="${(tool.toolart ?? '').replaceAll('"','&quot;')}"
           tabindex="0">
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
      const tpl = document.createElement("template");
      tpl.innerHTML = cardHTML.trim();
      const el = tpl.content.firstElementChild;
      el.classList.add("appear");
      grid.appendChild(el);
      el.addEventListener("animationend", () => el.classList.remove("appear"), { once: true });

      // Linksklick -> Detail-Modal
      el.addEventListener('click', async () => {
        const data = readToolDataFromCard(el);
        if ((!data.toolpfad || !data.toolart) && window.electron?.tool_details) {
          try {
            const more = await window.electron.tool_details(data.id);
            if (more) {
              data.toolpfad = data.toolpfad || more.toolpfad || '';
              data.toolart  = data.toolart  || more.toolart  || '';
            }
          } catch (e) { console.warn('tool_details fehlgeschlagen:', e); }
        }
        fillToolDetailModal(data);
        detailModal?.show();
      });

      // Tastatur
      el.addEventListener('keydown', async (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          const data = readToolDataFromCard(el);
          if ((!data.toolpfad || !data.toolart) && window.electron?.tool_details) {
            try {
              const more = await window.electron.tool_details(data.id);
              if (more) {
                data.toolpfad = data.toolpfad || more.toolpfad || '';
                data.toolart  = data.toolart  || more.toolart  || '';
              }
            } catch (e) { console.warn('tool_details fehlgeschlagen:', e); }
          }
          fillToolDetailModal(data);
          detailModal?.show();
        }
      });

    }, index * 100);
  });
}

// Funktion zum löschen der Tools im Userordner
async function speicher_bereinigen() {
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
}

// Funktion zum warten
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Funktion zum schließen der App
async function abmelden() {
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
}

// Funktion für den Test der SAP-Verbindung
async function sap_verbindung_test() {
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
}

/* ===================== Kontextmenü-Controller ===================== */
(function initContextMenuLoader() {
  const init = () => {
    const menu = document.getElementById('toolContextMenu');
    if (!menu) return;

    let currentToolId = null;

    // Rechtsklick auf Karten
    document.addEventListener('contextmenu', (ev) => {
      const card = ev.target.closest('.tool-card');
      if (!card) return;
      ev.preventDefault();
      ev.stopPropagation();
      currentToolId = card.getAttribute('data-tool-id');
      showMenuAt(ev.clientX, ev.clientY);
    });

    // Tastatur: Kontextmenü-Taste oder Shift+F10
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'ContextMenu' || (ev.shiftKey && ev.key === 'F10')) {
        const focusedCard = document.activeElement?.closest?.('.tool-card');
        if (!focusedCard) return;
        ev.preventDefault();
        currentToolId = focusedCard.getAttribute('data-tool-id');
        const r = focusedCard.getBoundingClientRect();
        showMenuAt(r.left + r.width / 2, r.top + r.height / 2);
      }
      if (ev.key === 'Escape') hideMenu();
    });

    // Klicken außerhalb / Scroll / Resize -> schließen
    document.addEventListener('pointerdown', (ev) => {
      if (!menu.contains(ev.target)) hideMenu();
    });
    window.addEventListener('scroll', hideMenu, true);
    window.addEventListener('resize', hideMenu);

    // Klicks im Menü ausführen
    menu.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      hideMenu();
      try { await runAction(action, currentToolId); }
      catch (e) { console.error(e); }
    });

    function showMenuAt(clientX, clientY) {
      // temporär sichtbar machen, um Größe zu ermitteln
      menu.style.visibility = 'hidden';
      menu.setAttribute('aria-hidden', 'false');

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mw = menu.offsetWidth;
      const mh = menu.offsetHeight;

      let left = clientX;
      let top  = clientY;

      if (left + mw > vw) left = Math.max(8, vw - mw - 8);
      if (top + mh > vh)  top  = Math.max(8, vh - mh - 8);

      menu.style.left = `${left}px`;
      menu.style.top  = `${top}px`;

      // kleinen Pfeil (Arrow) zur Klickposition ausrichten
      const tip = Math.max(12, Math.min((clientX - left), mw - 12));
      menu.style.setProperty('--tip-x', tip + 'px');

      menu.style.visibility = 'visible';

      // Fokus fürs Keyboard
      menu.querySelector('.item')?.focus({ preventScroll: true });
    }

    function hideMenu() {
      menu.setAttribute('aria-hidden', 'true');
    }

    // Business-Logik für Aktionen (Backend hooks optional)
    async function runAction(action, toolId) {
      switch (action) {
        case 'open':
          if (typeof tool_offnen === 'function') tool_offnen(toolId);
          break;

        case 'open_dir': {
          const res = await window.electron.dir_laden(toolId);
          if (res?.success) {
            tool_cards_laden();
          } else {
            console.error("Ordner konnte nicht geöffnet werden:", res?.message);
          }
          break;
        }

        case 'pin':
          if (window.electron?.tool_pin_toggle) {
            const ok = await window.electron.tool_pin_toggle(toolId);
            if (ok) tool_cards_laden();
          } else {
            console.log('[pin]', toolId);
          }
          break;

        case 'delete':
          try {
            const ask = await Swal.fire({
              icon: 'warning',
              title: 'Dieses Tool löschen?',
              text: 'Dieser Vorgang kann nicht rückgängig gemacht werden.',
              showCancelButton: true,
              confirmButtonText: 'Ja, löschen',
              cancelButtonText: 'Abbrechen'
            });
            if (!ask.isConfirmed) return;

            if (window.electron?.tool_loeschen) {
              const ok = await window.electron.tool_loeschen(toolId);
              if (ok.success === true) {
                await tool_cards_laden();
                await Swal.fire({ toast: true, position: 'bottom-end', timer: 2000, showConfirmButton: false, icon: 'success', title: 'Gelöscht' });
              } else {
                await Swal.fire({ toast: true, position: 'bottom-end', timer: 2000, showConfirmButton: false, icon: 'error', title: 'Keine Berechtigung' });
              }
            } else {
              console.log('[delete]', toolId);
            }
          } catch (err) {
            await Swal.fire({ icon: 'error', title: 'Fehler', text: String(err) });
          }
          break;
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

async function berechtigung_pruefen() {
  let user = await window.electron.username();
  user = user.toLowerCase();
  const developer = ["leons", "leon.stolz", "max.wandt", "roman.ensel", "jasmin.huber"];

  if (!developer.includes(user)) {
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
      title: "Keine Berechtigung für diesen Vorgang"
    });
  } else {
    // Modal nur öffnen, wenn Berechtigung vorhanden
    const myModal = new bootstrap.Modal(document.getElementById("toolModal"));
    myModal.show();
  }
}
