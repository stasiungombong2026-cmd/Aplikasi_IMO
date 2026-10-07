import {firebaseConfig} from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,addDoc,collection,query,where,getDocs,serverTimestamp,updateDoc} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import {jsPDF} from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';

const DRIVE_API_URL='GANTI_DENGAN_URL_APPS_SCRIPT';
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let currentUser=null,userProfile=null,photoData='',editingId=null,formFields=[];

const $=id=>document.getElementById(id);
const msg=(id,text,kind='notice')=>$(id).innerHTML=text?`<div class="${kind}">${text}</div>`:'';
function nowLocal(){const d=new Date();const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function setLogged(v){$('loginView').classList.toggle('hidden',v);$('appView').classList.toggle('hidden',!v);$('logoutBtn').classList.toggle('hidden',!v)}
async function loadSettings(){
  const s=await getDoc(doc(db,'settings','app'));
  formFields=s.exists()?(s.data().fields||[]):[];
  $('dynamicFields').innerHTML=formFields.map(f=>`<div><label>${f.label}${f.required?' *':''}</label>${f.type==='textarea'?`<textarea data-key="${f.key}" ${f.required?'required':''}></textarea>`:`<input data-key="${f.key}" type="${f.type||'text'}" ${f.required?'required':''}>`}</div>`).join('');
}
function readDynamic(){const o={};document.querySelectorAll('[data-key]').forEach(e=>o[e.dataset.key]=e.value);return o}
function fillProfile(){['nama','nipp','jabatan','upt'].forEach(k=>$(k).value=userProfile[k]||'');$('tanggal').value=new Date().toISOString().slice(0,10);$('waktu').value=nowLocal();$('userInfo').textContent=`Login sebagai ${userProfile.nama} • ${userProfile.upt}`}
async function loadRows(){
 const q=query(collection(db,'submissions'),where('uid','==',currentUser.uid)); const snap=await getDocs(q);
 $('myRows').innerHTML=snap.docs.map(d=>{const x=d.data();return `<tr><td>${x.tanggal||''}</td><td><span class="badge ${x.status==='verified'?'green':x.status==='rejected'?'red':'orange'}">${x.status||'draft'}</span></td><td>${x.driveUrl?`<a href="${x.driveUrl}" target="_blank">Buka PDF</a>`:'-'}</td><td>${x.status==='verified'&&!x.driveUrl?`<button class="btn" data-upload="${d.id}">Upload PDF</button>`:'-'}</td></tr>`}).join('');
 document.querySelectorAll('[data-upload]').forEach(b=>b.onclick=()=>uploadPdf(b.dataset.upload));
}
$('loginBtn').onclick=async()=>{try{await signInWithEmailAndPassword(auth,$('email').value,$('password').value)}catch(e){msg('loginMsg','Login gagal: '+e.message,'error')}};
$('registerBtn').onclick=()=>{$('loginView').classList.add('hidden');$('registerView').classList.remove('hidden')};
$('backLoginBtn').onclick=()=>{$('registerView').classList.add('hidden');$('loginView').classList.remove('hidden')};
$('createBtn').onclick=async()=>{
 try{
  const c=await createUserWithEmailAndPassword(auth,$('regEmail').value,$('regPassword').value);
  await setDoc(doc(db,'users',c.user.uid),{nama:$('regNama').value,nipp:$('regNipp').value,jabatan:$('regJabatan').value,upt:$('regUpt').value,role:'user'});
  msg('regMsg','Akun berhasil dibuat.','success');
 }catch(e){msg('regMsg',e.message,'error')}
};
$('logoutBtn').onclick=()=>signOut(auth);
$('foto').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{photoData=r.result;$('photoPreview').src=photoData;$('photoPreview').classList.remove('hidden')};r.readAsDataURL(f)};
$('saveBtn').onclick=()=>saveSubmission('draft');
$('submitBtn').onclick=()=>saveSubmission('submitted');

async function saveSubmission(status){
 if(!currentUser)return;
 const payload={uid:currentUser.uid,...userProfile,tanggal:$('tanggal').value,waktu:$('waktu').value,photo:photoData,fields:readDynamic(),status,updatedAt:serverTimestamp()};
 try{if(editingId)await updateDoc(doc(db,'submissions',editingId),payload);else{const r=await addDoc(collection(db,'submissions'),{...payload,createdAt:serverTimestamp()});editingId=r.id}
 msg('appMsg',status==='submitted'?'Data dikirim untuk verifikasi.':'Draft tersimpan.','success');await loadRows();
 }catch(e){msg('appMsg',e.message,'error')}
}
async function uploadPdf(id){
 const s=await getDoc(doc(db,'submissions',id));if(!s.exists())return;const x=s.data();
 const pdf=new jsPDF();pdf.setFontSize(16);pdf.text('FORM PENGUMPULAN DATA',20,20);pdf.setFontSize(11);
 let y=34;[['Nama',x.nama],['NIPP / NIPKWT',x.nipp],['Jabatan',x.jabatan],['UPT',x.upt],['Tanggal',x.tanggal],['Waktu',x.waktu]].forEach(([a,b])=>{pdf.text(`${a}: ${b||'-'}`,20,y);y+=8});
 for(const [k,v] of Object.entries(x.fields||{})){pdf.text(`${k}: ${String(v||'-')}`,20,y);y+=8;if(y>275){pdf.addPage();y=20}}
 if(x.photo){try{pdf.addImage(x.photo,'JPEG',20,y+4,55,55)}catch(e){}}
 const base64=pdf.output('datauristring').split(',')[1];
 try{
  const r=await fetch(DRIVE_API_URL,{method:'POST',body:JSON.stringify({action:'uploadPdf',fileName:`${x.tanggal}_${x.nipp}_${x.nama}.pdf`,base64,upt:x.upt})});
  const out=await r.json(); if(!out.ok)throw new Error(out.error||'Upload gagal');
  await updateDoc(doc(db,'submissions',id),{driveUrl:out.url,driveFileId:out.id,status:'uploaded',uploadedAt:serverTimestamp()});
  msg('appMsg','PDF berhasil di-upload ke Google Drive.','success');await loadRows();
 }catch(e){msg('appMsg','Upload gagal: '+e.message,'error')}
}
onAuthStateChanged(auth,async u=>{currentUser=u;if(!u){setLogged(false);return} const p=await getDoc(doc(db,'users',u.uid));if(!p.exists()){msg('loginMsg','Profil user belum ada.','error');await signOut(auth);return}userProfile=p.data();setLogged(true);await loadSettings();fillProfile();await loadRows()});
