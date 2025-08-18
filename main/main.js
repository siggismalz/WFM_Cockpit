// Importe
const {app,BrowserWindow,ipcMain,dialog,shell} = require("electron");
const path = require("path");
const os = require("os");
const odbc = require("odbc");
const fs = require("fs");
const winax = require("winax");

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
    title: "WFM Cockpit",
    icon: path.join(__dirname,"..","assets","icon.ico")
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

ipcMain.handle("tools_dursuchen", async (event,filter) => {
  try {
    const sql_string = `
    Select * from T_WFM_Cockpit 
    where  toolname like '%${filter}%' 
    or toolbeschreibung like '%${filter}%' 
    or toolart like '%${filter}%'`;

    const daten = await verbindung.query(sql_string);
    return daten;
  } catch(err){
      dialog.showMessageBox(mainwindow,{
        type: "error",
        title: "Fehler beim verbinden zur Datenbank",
        message: "Datenbankverbindung konnte nicht hergestellt werden.\n" + err,
        buttons: ['OK']
      });
      throw err;
  };
});

ipcMain.handle("tool_oeffnen", async (event, id) => {
  let daten = await verbindung.query(`SELECT toolpfad FROM T_WFM_Cockpit WHERE id = ${id}`);
  let pfad = daten[0]?.toolpfad;

  if (pfad && pfad !== "") {
    // Zielordner im Homedir
    const zielordner = path.join(os.homedir(), "WFM-Cockpit");

    // Ordner anlegen, falls er nicht existiert
    if (!fs.existsSync(zielordner)) {
      fs.mkdirSync(zielordner, { recursive: true });
    }

    // Zieldatei in diesem Ordner
    const zielpfad = path.join(zielordner, path.basename(pfad));

    try {
      fs.copyFileSync(pfad, zielpfad);
      await shell.openPath(zielpfad);
    } catch (err) {
      console.error("Fehler beim Kopieren/Öffnen:", err);
      throw err;
    }
  } else {
    console.log("Kein Pfad gefunden");
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

ipcMain.handle("tools_ordner_leeren", async () => {
  const zielordner = path.join(os.homedir(), "WFM-Cockpit");

  try {
    if (fs.existsSync(zielordner)) {
      // Alle Dateien im Ordner löschen
      for (const datei of fs.readdirSync(zielordner)) {
        const dateipfad = path.join(zielordner, datei);
        fs.rmSync(dateipfad, { recursive: true, force: true });
      }
    }
    return { success: true, message: "Ordner erfolgreich geleert." };
  } catch (err) {
    console.error("Fehler beim Leeren des Ordners:", err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle("abmelden",() => {
  app.quit();
});

// Funktionen
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
