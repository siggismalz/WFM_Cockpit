const {contextBridge,ipcRenderer} = require("electron");

// API's die öffentlich (exposed) im Frontend und im Backend zur Verfügung stehen
// Einzelne Funktionen sind in der main.js erklärt
contextBridge.exposeInMainWorld("electron",{
  username: () => ipcRenderer.invoke("username"),
  tools_laden: (filter) => ipcRenderer.invoke("tools_laden",(filter)),
  tool_oeffnen: (id) => ipcRenderer.invoke("tool_oeffnen",(id)),
  tool_speichern: (tool) => ipcRenderer.invoke("tool_speichern", tool),
  tools_dursuchen: (filter) => ipcRenderer.invoke("tools_dursuchen",filter),
  tools_ordner_leeren: () => ipcRenderer.invoke("tools_ordner_leeren"),
  abmelden: () => ipcRenderer.invoke("abmelden"),
  sap_verbindung_testen: () => ipcRenderer.invoke("sap_verbindung_testen"),
  tool_loeschen: (toolid) => ipcRenderer.invoke("tool_loeschen",(toolid)),
  dir_laden: (toolId) => ipcRenderer.invoke("dir_laden", toolId),
  favs_get: () => ipcRenderer.invoke("favs_get"),
  fav_toggle: (id) => ipcRenderer.invoke("fav_toggle", id),
  is_fav: (id) => ipcRenderer.invoke("is_fav", id),
  favs_set: (ids) => ipcRenderer.invoke("favs_set", ids),
});