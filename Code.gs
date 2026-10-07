const ROOT_FOLDER_ID = 'GANTI_ROOT_FOLDER_ID';

// Folder sumber dari beberapa Google Drive yang dibagikan ke akun yang
// menjalankan Apps Script. Masukkan ID folder, satu per baris.
const SOURCE_FOLDER_IDS = [
  // 'ID_FOLDER_UPT_1',
  // 'ID_FOLDER_UPT_2'
];

function doPost(e){
  try{
    const body=JSON.parse(e.postData.contents||'{}');
    if(body.action==='uploadPdf') return json(uploadPdf(body));
    return json({ok:false,error:'Action tidak dikenal'});
  }catch(err){return json({ok:false,error:String(err)})}
}

function doGet(e){
  try{
    if(e.parameter.action==='listFiles') return json({ok:true,files:listFiles()});
    return json({ok:true,service:'Pengumpul Data UPT'});
  }catch(err){return json({ok:false,error:String(err)})}
}

function uploadPdf(body){
  if(!body.base64) throw new Error('base64 PDF kosong');
  const root=DriveApp.getFolderById(ROOT_FOLDER_ID);
  const folderName=safe(body.upt||'Tanpa UPT');
  const it=root.getFoldersByName(folderName);
  const folder=it.hasNext()?it.next():root.createFolder(folderName);
  const bytes=Utilities.base64Decode(body.base64);
  const blob=Utilities.newBlob(bytes,'application/pdf',safe(body.fileName||'data.pdf'));
  const file=folder.createFile(blob);
  return {ok:true,id:file.getId(),url:file.getUrl(),name:file.getName()};
}

function listFiles(){
  const result=[];
  const ids=SOURCE_FOLDER_IDS.length?SOURCE_FOLDER_IDS:[ROOT_FOLDER_ID];
  ids.forEach(id=>{
    try{
      const folder=DriveApp.getFolderById(id);
      scan(folder,folder.getName(),result);
    }catch(err){}
  });
  return result.sort((a,b)=>String(b.created).localeCompare(String(a.created)));
}

function scan(folder,folderName,result){
  const files=folder.getFiles();
  while(files.hasNext()){
    const f=files.next();
    result.push({id:f.getId(),name:f.getName(),folder:folderName,created:f.getDateCreated().toISOString(),url:f.getUrl()});
  }
  const dirs=folder.getFolders();
  while(dirs.hasNext()){
    const d=dirs.next();
    scan(d,folderName+' / '+d.getName(),result);
  }
}

function safe(s){return String(s).replace(/[\\/:*?"<>|]/g,'_').slice(0,180)}
function json(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
