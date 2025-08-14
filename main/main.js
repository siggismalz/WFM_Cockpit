const {app,BrowserWindow,IPCMain} = require("electron");
const path = require("path");

let mainwindow;
const mainwindow_erstellen = () => {
  mainwindow = new BrowserWindow({
    height: 800,
    width: 1000,
    webPreferences: {
      preload: path.join(__dirname,"preload.js"),
      allowRunningInsecureContent: false,
      nodeIntegration: true
    },
    title: "WFM Cockpit"
  });

  mainwindow.loadFile(path.join(__dirname,"..","renderer","index.html"))
};

app.on("ready", () => {
  mainwindow_erstellen();
});

app.on("quit",() => {
  app.quit();
});
