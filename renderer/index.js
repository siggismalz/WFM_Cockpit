document.addEventListener("DOMContentLoaded", () => {
  const tooltipliste = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  [...tooltipliste].forEach(el => new bootstrap.Tooltip(el));
  username_holen();
});

function tool_offnen(toolpfad) {
  alert(toolpfad)
};

async function username_holen(){
  let username = await window.electron.username();
  document.getElementById("username").innerText = username;
}