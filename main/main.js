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

ipcMain.handle("tools_laden", async (filter) => {
  try {
    
    let where_filter = " 1 = 1";
    if(!filter.length === 0){
      where_filter = ` Bereich = '${filter}'` 
    };
    
    const verbindungszeichenfolge = "DRIVER=SQL Server;SERVER=SERVER;DATABASE=Testdata;trusted_connection=yes";
    const verbindung = await odbc.connect(verbindungszeichenfolge);

    const sql_string = `Select * from T_WFM_Cockpit where ${where_filter}`
    const daten = await verbindung.query(sql_string);

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
