const {contextBridge,ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("electron",{
  username: () => ipcRenderer.invoke("username"),
  tools_laden: () => ipcRenderer.invoke("tools_laden")
});