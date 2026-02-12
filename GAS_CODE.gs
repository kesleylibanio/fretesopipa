
/**
 * LOGITRANS - BACKEND v2.2
 * 
 * ATENÇÃO: Se aparecer erro de permissão do Drive, execute a função 'setup' 
 * manualmente no menu acima para autorizar o acesso.
 */

// Escopos necessários (comentário para o motor do Google):
// @OnlyCurrentDoc
// https://www.googleapis.com/auth/drive

const SECURITY_TOKEN = "LOGITRANS_SECRET_2025";
const FOLDER_NAME = "Comprovantes_LogiTrans";

/**
 * FUNÇÃO DE SETUP: Execute esta função manualmente no editor (botão Executar)
 * para garantir que todas as permissões do Drive sejam concedidas.
 */
function setup() {
  const folder = getFolder(FOLDER_NAME);
  Logger.log("Pasta verificada/criada com ID: " + folder.getId());
  Logger.log("Autorização concluída com sucesso!");
}

function doGet(e) {
  try {
    const token = e.parameter.token;
    if (token !== SECURITY_TOKEN) {
      return responseJSON({error: "Acesso não autorizado"});
    }
    
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
    
    if (payload.token !== SECURITY_TOKEN) {
      return responseText("Error: Unauthorized");
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
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
          if (key === "Viagens" && item.foto_nota && String(item.foto_nota).startsWith("data:image")) {
            item.foto_nota = saveToDrive(item.foto_nota, "NF_" + item.nota_fiscal + "_" + item.id);
          }
          return headers.map(h => item[h] || "");
        });
        
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
    }
    
    return responseText("success");
  } catch (err) {
    return responseText("Error: " + err.toString());
  }
}

function saveToDrive(base64Data, filename) {
  try {
    const folder = getFolder(FOLDER_NAME);
    const splitData = base64Data.split(',');
    const contentType = splitData[0].split(':')[1].split(';')[0];
    const bytes = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(bytes, contentType, filename + ".jpg");
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (e) {
    console.error("Erro upload: " + e.message);
    return "upload_error: " + e.message;
  }
}

function getFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(name);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function responseText(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
