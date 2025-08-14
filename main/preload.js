const {contextBridge,ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("electron",{
  username: () => ipcRenderer.invoke("username")
});