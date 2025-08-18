const {contextBridge,ipcRenderer, ipcMain} = require("electron");

contextBridge.exposeInMainWorld("electron",{
  username: () => ipcRenderer.invoke("username"),
  tools_laden: (filter) => ipcRenderer.invoke("tools_laden",(filter)),
  tool_oeffnen: (id) => ipcRenderer.invoke("tool_oeffnen",(id)),
  tool_speichern: (tool) => ipcRenderer.invoke("tool_speichern", tool),
  tools_dursuchen: (filter) => ipcRenderer.invoke("tools_dursuchen",filter),
  tools_ordner_leeren: () => ipcRenderer.invoke("tools_ordner_leeren"),
  abmelden: () => ipcRenderer.invoke("abmelden")
});