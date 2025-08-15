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
      where_filter = ` toolart = '${filter}'` 
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
    try{
      fs.copyFileSync(pfad,zielpfad)
      shell.openPath(zielpfad);} 
    catch(err){
        throw err;
    }
  } else {
    console.log("Kein Pfad gefunden")
  }

});

ipcMain.handle("tool_speichern", async (_evt, t) => {
  try {
    // Serverseitig minimal validieren
    const { toolname, toolbeschreibung, toolpfad, toolart } = t || {};
    if (![toolname, toolbeschreibung, toolpfad, toolart].every(v => typeof v === "string" && v.trim())) {
      throw new Error("Bitte alle Pflichtfelder ausfüllen.");
    }
    if (toolname.length > 50 || toolbeschreibung.length > 50 || toolart.length > 50 || toolpfad.length > 250) {
      throw new Error("Ein Feld überschreitet die maximale Länge.");
    }

    await verbindung.query(
      "INSERT INTO T_WFM_Cockpit (toolname, toolbeschreibung, toolpfad, toolart) VALUES (?,?,?,?)",
      [toolname, toolbeschreibung, toolpfad, toolart]
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message || String(err) };
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
