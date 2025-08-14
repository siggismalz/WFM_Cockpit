const {contextBridge,ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("electron",{
  username: () => ipcRenderer.invoke("username"),
  tools_laden: (filter) => ipcRenderer.invoke("tools_laden",(filter))
});