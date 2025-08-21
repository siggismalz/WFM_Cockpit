// ******************************************************** //
// Appstart                                                 //
// ******************************************************** //

document.addEventListener("DOMContentLoaded", () => {

  // Tooltips
  const tooltipListe = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  [...tooltipListe].forEach(el => new bootstrap.Tooltip(el));

  // Username
  username_holen();

  // Tools initial laden
  tool_cards_laden();

  // Modal "Neues Tool"
  const form = document.getElementById("toolForm");
  const modalEl = document.getElementById("toolModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const errorBox = document.getElementById("toolFormError");

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
        toolart: document.getElementById("toolart").value.trim(),
        version: document.getElementById("version").value.trim(),
        entwickler: document.getElementById("entwickler").value.trim(),
        beschreibung_lang: document.getElementById("beschreibung_lang").value.trim(),
        veroeffentlicht_am: document.getElementById("veroeffentlicht_am").value || null
      };

      try {
        if (window.electron?.tool_speichern) {
          const res = await window.electron.tool_speichern(daten);
          if (res?.ok) {
            modal.hide();
            tool_cards_laden();
            toast('success', 'Tool erfolgreich hinzugefügt');
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

// ******************************************************** //
// Sidebar Filter                                           //
// ******************************************************** //

document.getElementById("btn_gh_dispo_tools").addEventListener("click", () => tool_cards_laden("GH_Dispo"));
document.getElementById("btn_sonderprozesse").addEventListener("click", () => tool_cards_laden("Sonderprozesse"));
document.getElementById("btn_organisation").addEventListener("click", () => tool_cards_laden("Organisation"));
document.getElementById("btn_Auswertungen").addEventListener("click", () => tool_cards_laden("Auswertungen"));
document.getElementById("btn_mail").addEventListener("click", () => tool_cards_laden("Mailing"));
document.getElementById("btn_favoriten").addEventListener("click", () => tool_cards_laden("__FAVORITES__"));

// Suche
document.getElementById("btn_suche").addEventListener("click", () => {
  const filter = document.getElementById("T_suche").value;
  tools_dursuchen(filter);
});

// ******************************************************** //
// Helpers                                                  //
// ******************************************************** //

function toast(icon, title) {
  const Toast = Swal.mixin({
    toast: true,
    position: "bottom-end",
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    didOpen: (t) => { t.onmouseenter = Swal.stopTimer; t.onmouseleave = Swal.resumeTimer; }
  });
  Toast.fire({ icon, title });
}

// Tool öffnen
function tool_offnen(id) {
  window.electron.tool_oeffnen(id);
}

// Username abrufen
async function username_holen() {
  let username = await window.electron.username();
  document.getElementById("username").innerText = username;
}

// Warten
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Abmelden
async function abmelden() {
  toast('info', 'Du wirst nun abgemeldet');
  await wait(4000);
  window.electron.abmelden();
}

// SAP-Verbindung testen
async function sap_verbindung_test() {
  const ergebnis = window.electron.sap_verbindung_testen();
  if (ergebnis.success) toast('success', 'SAP-Verbindung erfolgreich hergestellt');
  else toast('error', 'Keine Verbindung zu SAP möglich');
}

// Speicher leeren
async function speicher_bereinigen() {
  await window.electron.tools_ordner_leeren();
  toast('success', 'Speicher erfolgreich bereinigt');
}

// ******************************************************** //
// Favoriten-Logik (pro Windows-User)                      //
// ******************************************************** //

let _cachedUser = null;

async function getCurrentUserLower() {
  if (_cachedUser) return _cachedUser;
  const u = (await window.electron.username()) || '';
  _cachedUser = String(u).toLowerCase();
  return _cachedUser;
}

async function getFavKey() {
  const user = await getCurrentUserLower();
  return `wfm_favs_${user}`;
}

async function favs_laden() {
  const key = await getFavKey();
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch { return []; }
}

async function favs_speichern(ids) {
  const key = await getFavKey();
  localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
}

async function is_fav(id) {
  const favs = await favs_laden();
  return favs.includes(id);
}

async function fav_toggle(id) {
  const favs = await favs_laden();
  const idx = favs.indexOf(id);
  if (idx >= 0) { favs.splice(idx, 1); await favs_speichern(favs); return false; }
  favs.push(id); await favs_speichern(favs); return true;
}

// UI-Helfer: Star-Icon aktualisieren
function set_star_btn_state(btn, active) {
  const icon = btn.querySelector('i');
  if (!icon) return;
  if (active) {
    icon.classList.remove('bi-star');
    icon.classList.add('bi-star-fill');
    btn.classList.add('active');
    btn.title = 'Aus Favoriten entfernen';
  } else {
    icon.classList.remove('bi-star-fill');
    icon.classList.add('bi-star');
    btn.classList.remove('active');
    btn.title = 'Zu Favoriten';
  }
}

// Wird vom Button in der Card aufgerufen
async function toggle_favorite_ui(btn, id) {
  const neu = await fav_toggle(id);
  set_star_btn_state(btn, neu);
  toast('success', neu ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
}

// ******************************************************** //
// Detail-Modal                                             //
// ******************************************************** //

const detailModalEl = document.getElementById('toolDetailModal');
const detailModal = detailModalEl ? new bootstrap.Modal(detailModalEl) : null;

function fillToolDetailModal(data) {
  document.getElementById('td_name').textContent = data.toolname || '';
  //document.getElementById('td_beschreibung').textContent = data.toolbeschreibung || '';
  document.getElementById('td_beschreibung_lang').textContent = data.beschreibung_lang || '';
  document.getElementById('td_pfad').textContent = data.toolpfad || '';
  document.getElementById('td_art').textContent = data.toolart || '';

  // Placeholder-Felder
  document.getElementById('td_version').textContent    = data.version     || '-';
  document.getElementById('td_entwickler').textContent = data.entwickler  || '-';
  // Veröffentlichungsdatum schön formatiert (handhabt String *und* Date-Objekt)
let d = data.veroeff instanceof Date ? data.veroeff : (data.veroeff ? new Date(data.veroeff) : null);
document.getElementById('td_veroeff').textContent = (d && !isNaN(d)) ? d.toLocaleDateString('de-DE') : (data.veroeff || '-');

  //document.getElementById('td_update').textContent     = data.update      || '-';

  // Buttons
  const btnOpen = document.getElementById('td_btn_open');
  const btnOpenDir = document.getElementById('td_btn_open_dir');
  const btnFav = document.getElementById('td_btn_fav');

  btnOpen.onclick = () => { detailModal?.hide(); tool_offnen(data.id); };
  btnOpenDir.onclick = async () => { try { await window.electron.dir_laden(data.id); } catch(e) { console.error(e); } };

  // Favorit-Status im Modal anzeigen
  (async () => {
    const fav = await is_fav(data.id);
    const icon = btnFav.querySelector('i');
    if (fav) { icon.classList.remove('bi-star'); icon.classList.add('bi-star-fill'); btnFav.classList.add('active'); btnFav.textContent = ''; btnFav.insertAdjacentHTML('afterbegin','<i class="bi bi-star-fill"></i> Favorit'); }
    else { icon.classList.remove('bi-star-fill'); icon.classList.add('bi-star'); btnFav.classList.remove('active'); btnFav.textContent = ''; btnFav.insertAdjacentHTML('afterbegin','<i class="bi bi-star"></i> Favorit'); }
  })();

  btnFav.onclick = async () => {
    const neu = await fav_toggle(data.id);
    const icon = btnFav.querySelector('i');
    if (neu) { icon.classList.remove('bi-star'); icon.classList.add('bi-star-fill'); btnFav.classList.add('active'); toast('success','Zu Favoriten hinzugefügt'); }
    else { icon.classList.remove('bi-star-fill'); icon.classList.add('bi-star'); btnFav.classList.remove('active'); toast('success','Aus Favoriten entfernt'); }
    // Cards evtl. aktualisieren, falls Favoriten-Filter aktiv ist
    const aktiverFavoritenFilter = document.querySelector('#btn_favoriten.active');
    if (aktiverFavoritenFilter) tool_cards_laden('__FAVORITES__');
  };
}

function readToolDataFromCard(cardEl) {
  return {
    id: cardEl.getAttribute('data-tool-id'),
    toolname: cardEl.getAttribute('data-tool-name') || cardEl.querySelector('.tool-title')?.textContent?.trim(),
    toolbeschreibung: cardEl.getAttribute('data-tool-desc') || cardEl.querySelector('.tool-desc')?.textContent?.trim(),
    toolpfad: cardEl.getAttribute('data-tool-path') || '',
    toolart: cardEl.getAttribute('data-tool-art') || '',
    version: cardEl.getAttribute('data-tool-version') || '',
    entwickler: cardEl.getAttribute('data-tool-dev') || '',
    veroeff: cardEl.getAttribute('data-tool-published') || '',
    update: cardEl.getAttribute('data-tool-updated') || '',
    beschreibung_lang: cardEl.getAttribute('data-tool-beschreibung-lang') || ''   // <<< NEU
  };
}


// ******************************************************** //
// Cards laden & Klick-Verhalten                            //
// ******************************************************** //

async function tool_cards_laden(filter) {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  let daten = await window.electron.tools_laden(filter && filter !== "__FAVORITES__" ? filter : undefined);
  if (!Array.isArray(daten)) daten = [];

  // Favoritenfilter anwenden (Frontend, pro User)
  if (filter === "__FAVORITES__") {
    const favs = await favs_laden();
    daten = daten.filter(t => favs.includes(String(t.id)));
    document.getElementById('btn_favoriten').classList.add('active');
  } else {
    document.getElementById('btn_favoriten').classList.remove('active');
  }

  if (daten.length === 0) return;

daten.forEach((tool, index) => {
  // >>> Feld-Mapping (beachtet Groß/Kleinschreibung aus der DB)
  const version          = tool.Version           ?? tool.version           ?? '';
  const entwickler       = tool.Entwickler        ?? tool.entwickler        ?? '';
  const beschreibungLang = tool.Beschreibung_lang ?? tool.beschreibung_lang ?? '';
  const veroeff          = tool.Veroeffentlicht_am?? tool.veroeffentlicht_am?? '';
  //const updated          = tool.Letztes_Update    ?? tool.letztes_update    ?? tool.Update ?? tool.update ?? '';

  const cardHTML = `
    <div class="card tool-card shadow-sm"
         data-tool-id="${tool.id}"
         data-tool-name="${escapeAttr(tool.toolname)}"
         data-tool-desc="${escapeAttr(tool.toolbeschreibung)}"
         data-tool-path="${escapeAttr(tool.toolpfad)}"
         data-tool-art="${escapeAttr(tool.toolart)}"
         data-tool-version="${escapeAttr(version)}"
         data-tool-dev="${escapeAttr(entwickler)}"
         data-tool-published="${escapeAttr(veroeff)}"
         data-tool-beschreibung-lang="${escapeAttr(beschreibungLang)}"
         tabindex="0">
      <div class="tool-accent"></div>
      <div class="card-body">
        <h6 class="tool-title mb-1">${tool.toolname}</h6>
        <p class="tool-desc mb-0">${tool.toolbeschreibung}</p>
      </div>
      <div class="card-footer bg-transparent d-flex gap-2 justify-content-end">
        <button class="btn btn-light tool-fav-btn" 
                onclick="event.stopPropagation(); toggle_favorite_ui(this, '${tool.id}')"
                aria-label="Favorit" title="Zu Favoriten">
          <i class="bi bi-star"></i>
        </button>
        <button class="btn btn-light tool-open-btn"
                onclick="event.stopPropagation(); tool_offnen('${tool.id}')"
                aria-label="Öffnen" title="Tool öffnen">
          <i class="bi bi-arrow-up-right"></i>
        </button>
      </div>
    </div>
  `;
    setTimeout(async () => {
      const tpl = document.createElement("template");
      tpl.innerHTML = cardHTML.trim();
      const el = tpl.content.firstElementChild;

      el.classList.add("appear");
      grid.appendChild(el);
      el.addEventListener("animationend", () => el.classList.remove("appear"), { once: true });

      // Favoriten-Icon initialer Zustand
      const favBtn = el.querySelector('.tool-fav-btn');
      const fav = await is_fav(String(tool.id));
      set_star_btn_state(favBtn, fav);

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

    }, index * 80);
  });
}

// Volltextsuche
async function tools_dursuchen(filter) {
  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  let daten = await window.electron.tools_dursuchen(filter);
  if (!Array.isArray(daten) || daten.length === 0) return;

  daten.forEach((tool, index) => {
    const cardHTML = `
      <div class="card tool-card shadow-sm"
     data-tool-id="${tool.id}"
     data-tool-name="${escape(tool.toolname)}"
     data-tool-desc="${escape(tool.toolbeschreibung)}"
     data-tool-path="${escape(tool.toolpfad)}"
     data-tool-art="${escape(tool.toolart)}"
     data-tool-version="${escape(tool.version)}"
     data-tool-dev="${escape(tool.entwickler)}"
     data-tool-published="${escape(tool.veroeffentlicht_am)}"
     data-tool-updated="${escape(tool.update)}"
     tabindex="0">
        <div class="tool-accent"></div>
        <div class="card-body">
          <h6 class="tool-title mb-1">${tool.toolname}</h6>
          <p class="tool-desc mb-0">${tool.toolbeschreibung}</p>
        </div>
        <div class="card-footer bg-transparent d-flex gap-2 justify-content-end">
          <button class="btn btn-light tool-fav-btn" 
                  onclick="event.stopPropagation(); toggle_favorite_ui(this, '${tool.id}')"
                  aria-label="Favorit" title="Zu Favoriten">
            <i class="bi bi-star"></i>
          </button>
          <button class="btn btn-light tool-open-btn"
                  onclick="event.stopPropagation(); tool_offnen('${tool.id}')"
                  aria-label="Öffnen" title="Tool öffnen">
            <i class="bi bi-arrow-up-right"></i>
          </button>
        </div>
      </div>
    `;
    setTimeout(async () => {
      const tpl = document.createElement("template");
      tpl.innerHTML = cardHTML.trim();
      const el = tpl.content.firstElementChild;
      el.classList.add("appear");
      grid.appendChild(el);
      el.addEventListener("animationend", () => el.classList.remove("appear"), { once: true });

      // Favoriten-Icon initial
      const favBtn = el.querySelector('.tool-fav-btn');
      const fav = await is_fav(String(tool.id));
      set_star_btn_state(favBtn, fav);

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

    }, index * 80);
  });
}

// ******************************************************** //
// Kontextmenü                                              //
// ******************************************************** //

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

      const tip = Math.max(12, Math.min((clientX - left), mw - 12));
      menu.style.setProperty('--tip-x', tip + 'px');

      menu.style.visibility = 'visible';
      menu.querySelector('.item')?.focus({ preventScroll: true });
    }

    function hideMenu() {
      menu.setAttribute('aria-hidden', 'true');
    }

    async function runAction(action, toolId) {
      switch (action) {
        case 'open':
          if (typeof tool_offnen === 'function') tool_offnen(toolId);
          break;

        case 'open_dir': {
          const res = await window.electron.dir_laden(toolId);
          if (!res?.success) console.error("Ordner konnte nicht geöffnet werden:", res?.message);
          break;
        }

        case 'fav_toggle': {
          // Favorit toggeln und UI ggf. aktualisieren
          const neu = await fav_toggle(String(toolId));
          toast('success', neu ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
          // Wenn Favoritenfilter aktiv, neu laden
          const aktiverFavoritenFilter = document.querySelector('#btn_favoriten.active');
          if (aktiverFavoritenFilter) tool_cards_laden('__FAVORITES__');
          else {
            // Sonst nur Icon an der betreffenden Card umschalten
            const card = document.querySelector(`.tool-card[data-tool-id="${CSS.escape(toolId)}"]`);
            const starBtn = card?.querySelector('.tool-fav-btn');
            if (starBtn) set_star_btn_state(starBtn, neu);
          }
          break;
        }

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
            await Swal.fire({ icon:'error', title:'Fehler', text:String(err) });
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

// ******************************************************** //
// Berechtigungsprüfung                                     //
// ******************************************************** //

async function berechtigung_pruefen() {
  let user = await window.electron.username();
  user = user.toLowerCase();
  const developer = ["leons","leon.stolz","max.wandt","roman.ensel","jasmin.huber"];

  if (!developer.includes(user)) {
    toast('error', 'Keine Berechtigung für diesen Vorgang');
  } else {
    const myModal = new bootstrap.Modal(document.getElementById("toolModal"));
    myModal.show();
  }
}

function escapeAttr(v) {
  return String(v ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

