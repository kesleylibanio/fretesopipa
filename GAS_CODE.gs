
/**
 * LOGITRANS - BACKEND v3.0 OPTIMIZED
 * Performance focada em baixa latência e economia de chamadas API.
 */

const SECURITY_TOKEN = "LOGITRANS_SECRET_2025";
const FOLDER_NAME = "Comprovantes_LogiTrans";

function setup() {
  const folder = getFolder(FOLDER_NAME);
  Logger.log("Pasta OK ID: " + folder.getId());
}

function doGet(e) {
  try {
    const token = e.parameter.token;
    if (token !== SECURITY_TOKEN) return responseJSON({error: "Unauthorized"});
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    const db = {};
    
    sheets.forEach(sheet => {
      const name = sheet.getName();
      const data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        const headers = data.shift();
        db[name] = data.map(row => {
          const obj = {};
          headers.forEach((h, i) => { if(h) obj[h] = row[i]; });
          return obj;
        });
      } else {
        db[name] = [];
      }
    });
    
    return responseJSON(db);
  } catch (err) {
    return responseJSON({error: err.toString()});
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.token !== SECURITY_TOKEN) return responseText("Error: Unauthorized");
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const folder = getFolder(FOLDER_NAME); // Cacheado

    for (const key in payload) {
      if (key === 'token') continue;
      
      const data = payload[key];
      if (!Array.isArray(data)) continue;
      
      let sheet = ss.getSheetByName(key);
      if (!sheet) sheet = ss.insertSheet(key);
      
      sheet.clearContents();
      
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        sheet.appendRow(headers);
        
        const rows = data.map(item => {
          // Só tenta salvar no Drive se for um base64 novo
          if (key === "Viagens" && item.foto_nota && String(item.foto_nota).startsWith("data:image")) {
             item.foto_nota = saveToDriveOptimized(item.foto_nota, "NF_" + item.nota_fiscal + "_" + item.id, folder);
          }
          return headers.map(h => item[h] || "");
        });
        
        // Escrita em lote única para máxima performance
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
    }
    
    return responseText("success");
  } catch (err) {
    return responseText("Error: " + err.toString());
  }
}

function saveToDriveOptimized(base64Data, filename, folder) {
  try {
    const splitData = base64Data.split(',');
    const contentType = splitData[0].split(':')[1].split(';')[0];
    const bytes = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(bytes, contentType, filename + ".jpg");
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "error";
  }
}

// Otimização: Cache do Folder ID nas ScriptProperties para evitar buscas globais lentas
function getFolder(name) {
  const props = PropertiesService.getScriptProperties();
  const cachedId = props.getProperty('FOLDER_ID');
  
  if (cachedId) {
    try {
      return DriveApp.getFolderById(cachedId);
    } catch (e) {
      props.deleteProperty('FOLDER_ID');
    }
  }
  
  const folders = DriveApp.getFoldersByName(name);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function responseText(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
