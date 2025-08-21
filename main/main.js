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

// favorites.json liegt in %HOMEPATH%\WFM-Cockpit\favorites.json
function getFavsFilePath() {
  const base = path.join(os.homedir(), "WFM-Cockpit");
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return path.join(base, "favorites.json");
}

function readFavsFileSafe() {
  const file = getFavsFilePath();
  try {
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, "utf8");
    const obj = JSON.parse(raw);
    return (obj && typeof obj === "object") ? obj : {};
  } catch {
    return {};
  }
}

function writeFavsFileSafe(obj) {
  const file = getFavsFilePath();
  try {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("[favorites] write error:", e);
    return false;
  }
}

// Liefert Liste der Favoriten-IDs für den aktuellen Windows-User
ipcMain.handle("favs_get", async () => {
  const user = os.userInfo().username.toLowerCase();
  const all = readFavsFileSafe();
  const arr = Array.isArray(all[user]) ? all[user] : [];
  return arr.map(String);
});

// Prüft Favorit
ipcMain.handle("is_fav", async (evt, id) => {
  const user = os.userInfo().username.toLowerCase();
  const all = readFavsFileSafe();
  const arr = Array.isArray(all[user]) ? all[user] : [];
  const set = new Set(arr.map(String));
  return set.has(String(id));
});

// Toggle Favorit
ipcMain.handle("fav_toggle", async (evt, id) => {
  const user = os.userInfo().username.toLowerCase();
  const all = readFavsFileSafe();
  const arr = Array.isArray(all[user]) ? all[user] : [];
  const set = new Set(arr.map(String));
  const key = String(id);

  let active;
  if (set.has(key)) {
    set.delete(key);
    active = false;
  } else {
    set.add(key);
    active = true;
  }

  all[user] = Array.from(set);
  writeFavsFileSafe(all);

  return { active, list: all[user] };
});

// Optional: Bulk setzen (falls du irgendwann brauchst)
ipcMain.handle("favs_set", async (evt, ids) => {
  const user = os.userInfo().username.toLowerCase();
  const all = readFavsFileSafe();
  const cleaned = Array.from(new Set((ids || []).map(String)));
  all[user] = cleaned;
  writeFavsFileSafe(all);
  return cleaned;
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
