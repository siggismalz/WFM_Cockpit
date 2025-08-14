// Importe
const {app,BrowserWindow,IPCMain, ipcMain} = require("electron");
const path = require("path");
const os = require("os");
const odbc = require("odbc");


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

ipcMain.handle("tools_laden", async () => {
  try {
    const verbindungszeichenfolge = 
      "DRIVER=SQL Server;SERVER=SERVER;DATABASE=Testdata;trusted_connection=yes";

    // Verbindung öffnen (ohne Callback)
    const verbindung = await odbc.connect(verbindungszeichenfolge);
    console.log("Erfolg beim Herstellen der Verbindung");

    // Abfrage ausführen
    const daten = await verbindung.query("SELECT * FROM T_WFM_Cockpit");

    // Verbindung schließen
    await verbindung.close();

    // Daten zurückgeben
    return daten;

  } catch (err) {
    console.error("Fehler:", err);
    throw err;
  }
});

// App-Ereignisse
app.on("ready", () => {
  mainwindow_erstellen();
});

app.on("quit",() => {
  app.quit();
});
