// Importe
const {app,BrowserWindow,IPCMain, ipcMain} = require("electron");
const path = require("path");
const os = require("os");


// Windows
let mainwindow;
const mainwindow_erstellen = () => {
  mainwindow = new BrowserWindow({
    height: 800,
    width: 1350,
    webPreferences: {
      preload: path.join(__dirname,"preload.js"),
      allowRunningInsecureContent: false,
      nodeIntegration: true
    },
    title: "WFM Cockpit"
  });

  mainwindow.loadFile(path.join(__dirname,"..","renderer","index.html"))
};

//IPC Handler
ipcMain.handle("username",() => {
  let username = os.userInfo().username;
  return username;
});

// App-Ereignisse
app.on("ready", () => {
  mainwindow_erstellen();
});

app.on("quit",() => {
  app.quit();
});
