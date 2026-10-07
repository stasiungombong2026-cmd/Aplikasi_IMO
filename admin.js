import {firebaseConfig} from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {getAuth,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,getDocs,updateDoc} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
const DRIVE_API_URL='GANTI_DENGAN_URL_APPS_SCRIPT';
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);const $=id=>document.getElementById(id);
const msg=(t,k='notice')=>$('msg').innerHTML=t?`<div class="${k}">${t}</div>`:'';
async function checkAdmin(u){const p=await getDoc(doc(db,'users',u.uid));if(!p.exists()||p.data().role!=='admin'){location.href='index.html';return false}return true}
async function loadSettings(){const s=await getDoc(doc(db,'settings','app'));$('fields').value=JSON.stringify(s.exists()?s.data().fields||[]:[],null,2)}
async function loadRows(){
 const snap=await getDocs(collection(db,'submissions'));$('rows').innerHTML='';
 for(const d of snap.docs){const x=d.data();const tr=document.createElement('tr');tr.innerHTML=`<td>${x.nama||''}</td><td>${x.upt||''}</td><td>${x.tanggal||''}</td><td><span class="badge ${x.status==='verified'?'green':x.status==='rejected'?'red':'orange'}">${x.status||'draft'}</span></td><td><button class="btn green" data-v="${d.id}" ${x.status!=='submitted'?'disabled':''}>Verifikasi</button> <button class="btn red" data-r="${d.id}" ${x.status!=='submitted'?'disabled':''}>Tolak</button></td>`;$('rows').appendChild(tr)}
 document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>setStatus(b.dataset.v,'verified'));document.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>setStatus(b.dataset.r,'rejected'));
}
async function setStatus(id,status){await updateDoc(doc(db,'submissions',id),{status});await loadRows();msg('Status diperbarui.','success')}
$('saveSettings').onclick=async()=>{try{const fields=JSON.parse($('fields').value);await setDoc(doc(db,'settings','app'),{fields},{merge:true});msg('Template form disimpan.','success')}catch(e){msg('JSON tidak valid: '+e.message,'error')}};
$('aggregateBtn').onclick=async()=>{try{const r=await fetch(DRIVE_API_URL+'?action=listFiles');const out=await r.json();$('driveRows').innerHTML=(out.files||[]).map(x=>`<tr><td>${x.name}</td><td>${x.folder}</td><td>${x.created}</td><td><a target="_blank" href="${x.url}">Buka</a></td></tr>`).join('')}catch(e){msg('Gagal mengambil data Drive: '+e.message,'error')}};
$('logoutBtn').onclick=()=>signOut(auth);
onAuthStateChanged(auth,async u=>{if(!u){location.href='index.html';return}if(await checkAdmin(u)){await loadSettings();await loadRows()}});
