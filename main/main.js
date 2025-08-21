// ***************************** //
// Importe und Verbindlichkeiten //
// ----------------------------- //
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const os = require("os");
const odbc = require("odbc");
const fs = require("fs");
const winax = require("winax");

// Globale Datenbankverbindung
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
      preload: path.join(__dirname, "preload.js"),
      allowRunningInsecureContent: false,
      nodeIntegration: true
    },
    title: "WFM Cockpit",
    icon: path.join(__dirname, "..", "assets", "icon.ico")
  });

  mainwindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"))
};

// Splashscreen für den Appstart (optional)
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
  splashscreen.loadFile(path.join(__dirname, "..", "renderer", "splash.html"));
};

// ************************************************ //
// IPC Handler für das verarbeiten von API-Anfragen //
// ------------------------------------------------ //

// username wird ermittelt
ipcMain.handle("username", () => {
  let username = os.userInfo().username;
  return username;
});

// Die Tools werden von der Datenbank abgerufen
ipcMain.handle("tools_laden", async (event, filter) => {
  try {
    let where_filter = " 1 = 1";
    if (filter && String(filter).trim() !== "") {
      where_filter = ` toolart = '${filter}'`;
    }

    const sql_string = `Select * from T_WFM_Cockpit where ${where_filter}`;
    const daten = await verbindung.query(sql_string);
    return daten;

  } catch (err) {
    dialog.showMessageBox(mainwindow, {
      type: "error",
      title: "Fehler beim verbinden zur Datenbank",
      message: "Datenbankverbindung konnte nicht hergestellt werden.\n" + err,
      buttons: ['OK']
    });
    throw err;
  }
});

// Volltext-Suche
ipcMain.handle("tools_dursuchen", async (event, filter) => {
  try {
    const f = (filter ?? "").replaceAll("'", "''");
    const sql_string = `
      Select * from T_WFM_Cockpit 
      where  toolname like '%${f}%' 
      or toolbeschreibung like '%${f}%' 
      or toolart like '%${f}%'`;

    const daten = await verbindung.query(sql_string);
    return daten;
  } catch (err) {
    dialog.showMessageBox(mainwindow, {
      type: "error",
      title: "Fehler beim verbinden zur Datenbank",
      message: "Datenbankverbindung konnte nicht hergestellt werden.\n" + err,
      buttons: ['OK']
    });
    throw err;
  }
});

// Tool öffnen: Datei in %HOMEPATH%\WFM-Cockpit kopieren & öffnen
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

// Neues Tool speichern
ipcMain.handle("tool_speichern", async (_evt, t) => {
  try {
    const { toolname, toolbeschreibung, toolpfad, toolart,
            version, entwickler, beschreibung_lang, veroeffentlicht_am } = t || {};

    if (![toolname, toolbeschreibung, toolpfad, toolart].every(v => typeof v === "string" && v.trim())) {
      throw new Error("Bitte alle Pflichtfelder ausfüllen.");
    }

    await verbindung.query(
      `INSERT INTO T_WFM_Cockpit 
        (toolname, toolbeschreibung, toolpfad, toolart, Version, Entwickler, Beschreibung_lang, Veroeffentlicht_am) 
       VALUES (?,?,?,?,?,?,?,?)`,
      [toolname, toolbeschreibung, toolpfad, toolart, version, entwickler, beschreibung_lang, veroeffentlicht_am]
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message || String(err) };
  }
});


// Arbeitsordner leeren
ipcMain.handle("tools_ordner_leeren", async () => {
  const zielordner = path.join(os.homedir(), "WFM-Cockpit");

  try {
    if (fs.existsSync(zielordner)) {
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

// App schließen
ipcMain.handle("abmelden", () => {
  app.quit();
});

// SAP Verbindung testen
ipcMain.handle("sap_verbindung_testen", async () => {
  const erfolg = await sap_verbindung();
  return erfolg;
});

// Tool löschen (nur Devs)
ipcMain.handle("tool_loeschen", async (event, id) => {
  try {
    const user = os.userInfo().username.toLowerCase();
    const developer = ["leons", "leon.stolz", "max.wandt", "roman.ensel", "jasmin.huber"];
    if (developer.includes(user)) {
      await verbindung.query(`DELETE FROM T_WFM_COCKpit WHERE ID = ${id}`);
      console.log(`DELETE FROM T_WFM_COCKpit WHERE ID = ${id}`);
      return { success: true, message: "erfolgreich gelöscht" };
    } else {
      return { success: false, message: "Keine Berechtigung" }
    }

  } catch (err) {
    return { success: false, message: err.message };
  }
});

// Ordner des Tools öffnen
ipcMain.handle("dir_laden", async (event, id) => {
  try {
    const sql = `Select toolpfad from T_WFM_Cockpit where id = ${id}`;
    const daten = await verbindung.query(sql);
    let pfad = daten[0]?.toolpfad;
    pfad = path.normalize(pfad);
    const ordnerPfad = path.dirname(path.normalize(pfad));
    const result = await shell.openPath(ordnerPfad);
    if (result) {
      return { success: false, message: "Fehler beim Öffnen: " + result };
    }
    return { success: true };
  } catch (err) {
    console.error("[dir_laden] Fehler:", err);
    return { success: false, message: err?.message || String(err) };
  }
});

// *************************** //
// Favoriten (Dateispeicher)    //
// --------------------------- //

// Pfade ermitteln
function getProjectFavsPath() {
  // Liegt im Projektordner – neben main.js
  return path.join(__dirname, "favorites.json");
}

function getUserDataFavsPath() {
  // Electron-spezifischer, pro Benutzer beschreibbarer Speicherort
  return path.join(app.getPath("userData"), "favorites.json");
}

// Helfer: Datei sicher lesen -> Objekt
function readJsonFileSafe(file) {
  try {
    if (!fs.existsSync(file)) return undefined;
    const raw = fs.readFileSync(file, "utf8");
    const obj = JSON.parse(raw);
    return (obj && typeof obj === "object") ? obj : {};
  } catch (e) {
    console.warn("[favorites] read error:", e.message);
    return undefined;
  }
}

// Helfer: Pfad der *Lesedatei* auflösen
// Priorität: Projektdatei > UserData-Datei
function resolveFavsReadPath() {
  const pProject = getProjectFavsPath();
  const pUser = getUserDataFavsPath();
  if (fs.existsSync(pProject)) return pProject;
  if (fs.existsSync(pUser)) return pUser;
  // keine Datei vorhanden -> Standard: Projektpfad
  return pProject;
}

// Helfer: Schreiben – zuerst Projektordner versuchen, sonst UserData
function writeFavsFileSafe(obj) {
  const projectPath = getProjectFavsPath();
  const userDataPath = getUserDataFavsPath();

  // 1) Projektordner versuchen
  try {
    fs.writeFileSync(projectPath, JSON.stringify(obj, null, 2), "utf8");
    return { ok: true, path: projectPath, fallback: false };
  } catch (e) {
    console.warn("[favorites] write to project failed:", e.message);
  }

  // 2) Fallback: UserData (Verzeichnis ggf. anlegen)
  try {
    const dir = path.dirname(userDataPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(userDataPath, JSON.stringify(obj, null, 2), "utf8");
    return { ok: true, path: userDataPath, fallback: true };
  } catch (e2) {
    console.error("[favorites] write fallback failed:", e2);
    return { ok: false, error: e2.message };
  }
}

// Lesen: Projekt bevorzugt, sonst UserData
function readFavsFile() {
  const pathToRead = resolveFavsReadPath();
  const obj = readJsonFileSafe(pathToRead);
  return { obj: obj ?? {}, path: pathToRead };
}

// ===== IPC-Handler =====

// Favoritenliste (IDs) für aktuellen Windows-User lesen
ipcMain.handle("favs_get", async () => {
  const user = os.userInfo().username.toLowerCase();
  const { obj } = readFavsFile();
  const arr = Array.isArray(obj[user]) ? obj[user] : [];
  return arr.map(String);
});

// Ist ID Favorit?
ipcMain.handle("is_fav", async (_evt, id) => {
  const user = os.userInfo().username.toLowerCase();
  const { obj } = readFavsFile();
  const arr = Array.isArray(obj[user]) ? obj[user] : [];
  return new Set(arr.map(String)).has(String(id));
});

// Toggle Favorit (schreibt mit Fallback)
ipcMain.handle("fav_toggle", async (_evt, id) => {
  const user = os.userInfo().username.toLowerCase();
  const { obj } = readFavsFile();

  const current = Array.isArray(obj[user]) ? obj[user].map(String) : [];
  const set = new Set(current);
  const key = String(id);
  let active;

  if (set.has(key)) {
    set.delete(key);
    active = false;
  } else {
    set.add(key);
    active = true;
  }

  obj[user] = Array.from(set);
  const res = writeFavsFileSafe(obj);
  if (!res.ok) {
    return { active, list: obj[user], error: res.error };
  }
  return { active, list: obj[user], path: res.path, fallback: res.fallback };
});

// Optional: komplette Liste setzen (Bulk)
ipcMain.handle("favs_set", async (_evt, ids) => {
  const user = os.userInfo().username.toLowerCase();
  const { obj } = readFavsFile();
  obj[user] = Array.from(new Set((ids || []).map(String)));
  const res = writeFavsFileSafe(obj);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, path: res.path, fallback: res.fallback, list: obj[user] };
});

// Optional: Infos zum Speicherort ausgeben (Debug)
ipcMain.handle("favs_storage_info", async () => {
  const readInfo = resolveFavsReadPath();
  // Test-Schreibprobe (ohne Datei zu verändern): wir prüfen nur, *wo* wir schreiben würden
  const tryProject = (() => {
    try {
      fs.accessSync(path.dirname(getProjectFavsPath()), fs.constants.W_OK);
      return true;
    } catch { return false; }
  })();
  return {
    readFrom: readInfo,
    preferredWrite: getProjectFavsPath(),
    canWriteProjectDir: tryProject,
    fallbackWrite: getUserDataFavsPath()
  };
});

// *************************** //
// Allgemeine  Hilfsfunktionen //
// --------------------------- //

// DB-Verbindung
async function datenbank_verbindung() {
  const verbindungszeichenfolge =
    "DRIVER={ODBC Driver 18 for SQL Server};SERVER=SERVER;DATABASE=Testdata;Trusted_Connection=Yes;TrustServerCertificate=Yes;";
  verbindung = await odbc.connect(verbindungszeichenfolge);
}

// SAP-GUI Scripting Check
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
    return { success: true, message: "SAP-Verbindung erfolgreich hergestellt", verbindung: sap_verbindung };
  } catch (err) {
    return { success: false, message: "Fehler: " + err.message };
  }
}

// ************************* //
// Allgemeine App-Ereignisse //
// ------------------------- //

app.on("ready", async () => {
  await datenbank_verbindung();
  // splashscreen_erstellen();
  // setTimeout(() => {
  //   splashscreen.close();
  //   mainwindow_erstellen();
  // }, 4000);
  mainwindow_erstellen();
});

app.on("quit", () => {
  app.quit();
});

app.on("before-quit", async () => {
  if (verbindung) await verbindung.close();
});
