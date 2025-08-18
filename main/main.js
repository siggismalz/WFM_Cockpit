// ***************************** //
// Importe und Verbindlichkeiten //
// ----------------------------- //
const {app,BrowserWindow,ipcMain,dialog,shell} = require("electron");
const path = require("path");
const os = require("os");
const odbc = require("odbc");
const fs = require("fs");
const winax = require("winax");

// Globale Datenbankverbindung
// Die Verbindung wird für die ganze App-Laufzeit aufrecht gehalten
let verbindung;

// *************************** //
// Alle definierten Appfenster //
// --------------------------- //

// Das Mainwindow ist das Hauptprozess-Fenster
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

// Splashscreen für den Appstart
// !ToDo: Eventuell validierungsfunktionen einfügen für einen echten Health-Check
let splashscreen;
const splashscreen_erstellen = () => {
  splashscreen = new BrowserWindow({
    title: "",
    width: 500,
    height: 500,
    autoHideMenuBar: true,
    maximizable: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    center: true
  });
  splashscreen.loadFile(path.join(__dirname,"..","renderer","splash.html"));
};

// ************************************************ //
// IPC Handler für das verarbeiten von API-Anfragen //
// ------------------------------------------------ //

// username wird ermittelt
ipcMain.handle("username",() => {
  let username = os.userInfo().username;
  return username;
});

// Die Tools werden von der Datenbank abgerufen
// Wenn der Parameter "filter" nicht mitgegeben wurde, dann wird der where-Filter
// im SQL-String auf 1=1 (true) gesetzt
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

// Ähnliche Funktion wie "tools_laden". Aber diese Funktion hier ist für die Volltext-Suche im Tool ausgelegt
// Wenn der "filter"-Parameter mitgegeben wird, dann werden jegliche Spalten anhand von wildcards durchsucht.
// Die Ergebnisse werden dann im Tool zurückgegeben
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

// Funktionalität zum öffnen der Tools
// Im Homedirectory des Users wird der Ordner "WFM-Cockpit" einmalig erstellt.
// Die Tools werden anhand des id Parameters ermittelt. Das Tool wird in den Ordner kopiert und von dort aus geöffnet.
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

// Neue Tools, die ins Tool eingefügt werden sollen, werden über diese API in die Datenbank geschrieben
ipcMain.handle("tool_speichern", async (_evt, t) => {
  try {
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

// Der Ordner im Homedirectory wird geleert. Alle vorhandenen Tools darin werden gelöscht.
// Keine Gefahr, da nur Userseitig
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

// Das Tool schließt sich
ipcMain.handle("abmelden",() => {
  app.quit();
});

//SAP Verbindung wird getestet
ipcMain.handle("sap_verbindung_testen",async () => {
  const erfolg = await sap_verbindung();
  return erfolg;
});

ipcMain.handle("tool_loeschen", async (event, id) => {
  try {
    const user = os.userInfo().username.toLowerCase();
    const developer = ["leon.stolz","max.wandt","roman.ensel","jasmin.huber"]
    if (developer.includes(user)) {
      await verbindung.query(`DELETE FROM T_WFM_Cockpit WHERE ID = ${id}`);
      console.log(`DELETE FROM T_WFM_Cockpit WHERE ID = ${id}`)
      return { success: true, message: "erfolgreich gelöscht" };
    } else {
      return {success: false, message: "Keine Berechtigung"}
    }

  } catch (err) {
    return { success: false, message: err.message };
  }
});


// *************************** //
// Allgemeine  Hilfsfunktionen //
// --------------------------- //

// Hier wird die Verbindung zur Datenbank aufgebaut
async function datenbank_verbindung() {
  const verbindungszeichenfolge = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=SERVER;DATABASE=Testdata;Trusted_Connection=Yes;TrustServerCertificate=Yes;";
  verbindung = await odbc.connect(verbindungszeichenfolge);
}

// Hier prüfen wir ob eine Verbindung zu SAP-GUIXT möglich ist. 
// Inkl. Rückmeldung über Erfolg oder Misserfolg
async function sap_verbindung() {
  try {
    const com = new winax.Object("SapROTWr.SAPROTWrapper");
    const sapguiauto = com.GetROTEntry("SAPGUI");
    if (!sapguiauto) {
      return { success: false, message: "SAPGUI nicht gefunden" };
    }
    const app = sapguiauto.GetScriptingEngine();
    const anzahl_verbindungen = app.Children.Count;
    if (anzahl_verbindungen === 0) {
      return { success: false, message: "Keine aktive SAP-Verbindung gefunden" };
    }
    const sap_verbindung = app.Children.Item(0);
    const anzahl_children = sap_verbindung.Children.Count();
    if (anzahl_children === 0) {
      return { success: false, message: "Keine SAP Session gefunden" };
    }
    // Wenn alles ok
    return { success: true, message: "SAP-Verbindung erfolgreich hergestellt", verbindung: sap_verbindung };

  } catch (err) {
    return { success: false, message: "Fehler: " + err.message };
  }
}

// ************************* //
// Allgemeine App-Ereignisse //
// ------------------------- //

// Event beim starten der APP
app.on("ready",async () => {
  await datenbank_verbindung();
  //splashscreen_erstellen();
  //setTimeout(() => {
  //  splashscreen.close();
  //  mainwindow_erstellen();
  //},4000);
mainwindow_erstellen();
});

// Event beim beenden der APP
app.on("quit",() => {
  app.quit();
});

// Event bevor die App beendet wird
// Verbindung zum Server wird getrennt
app.on("before-quit",async () => {
  if (verbindung) await verbindung.close();
});
