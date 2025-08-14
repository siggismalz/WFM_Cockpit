document.addEventListener("DOMContentLoaded", () => {
  const tooltipliste = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  [...tooltipliste].forEach(el => new bootstrap.Tooltip(el));
  username_holen();
tool_cards_laden();
});

function tool_offnen(toolpfad) {
  alert(toolpfad)
};

async function username_holen(){
  let username = await window.electron.username();
  document.getElementById("username").innerText = username;
};

async function tool_cards_laden(){
  let daten = await window.electron.tools_laden();
  if (daten.length === 0) return; 

  const grid = document.querySelector(".card-grid");
  grid.innerHTML = "";

  daten.forEach(tool => {
    grid.innerHTML += `
      <div class="card">
        <div class="card-body" style="height: 120px; overflow-y: auto;">
          <h5 class="card-title text-black mt-1">${tool.toolname}</h5>
          <p class="card-text mt-3">${tool.toolbeschreibung}</p>
        </div>
        <div class="container-fluid ms-0 ps-0 mt-4 card-footer bg-body">
          <button class="btn border-0" onclick="tool_offnen('${tool.id}')">Öffnen</button>
        </div>
      </div>
    `
  });

};
