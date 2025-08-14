// Importe
const {app,BrowserWindow,ipcMain,dialog} = require("electron");
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
      "DRIVER=SQL Server;SERVER=SERVER;DATABASE=Testdat;trusted_connection=yes";

    const verbindung = await odbc.connect(verbindungszeichenfolge);

    const daten = await verbindung.query("SELECT * FROM T_WFM_Cockpit");
    await verbindung.close();
    return daten;
    } catch (err) {
      dialog.showMessageBox(mainwindow,{
        type: "error",
        title: "Fehler beim verbinden zur Datenbank",
        message: "Datenbankverbindung konnte nicht hergestellt werden.\n" + err,
        buttons: ['OK']
      });
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
