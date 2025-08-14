// Importe
const {app,BrowserWindow,ipcMain,dialog,shell} = require("electron");
const path = require("path");
const os = require("os");
const odbc = require("odbc");
const fs = require("fs");

let verbindung;

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

ipcMain.handle("tools_laden", async (event,filter) => {
  try {
    
    let where_filter = " 1 = 1";
    if(filter && filter.trim() !== ""){
      where_filter = ` Bereich = '${filter}'` 
    };

    const sql_string = `Select * from T_WFM_Cockpit where ${where_filter}`
    const daten = await verbindung.query(sql_string);

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

ipcMain.handle("tool_oeffnen", async (event, id) => {
  let daten = await verbindung.query(`Select toolpfad from T_WFM_Cockpit where id =${id}`);
  pfad = daten[0].toolpfad
  
  if (pfad !== ""){
    let zielpfad = path.join(os.homedir(),path.basename(pfad));
    fs.copyFileSync(pfad,zielpfad)
    shell.openPath(zielpfad);
  } else {
    console.log("Kein Pfad gefunden")
  }

});


async function datenbank_verbindung() {
  const verbindungszeichenfolge = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=SERVER;DATABASE=Testdata;Trusted_Connection=Yes;TrustServerCertificate=Yes;";
  verbindung = await odbc.connect(verbindungszeichenfolge);
}

// App-Ereignisse
app.on("ready",async () => {
  mainwindow_erstellen();
  await datenbank_verbindung();
});

app.on("quit",() => {
  app.quit();
});

app.on("before-quit",async () => {
  if (verbindung) await verbindung.close();
});
