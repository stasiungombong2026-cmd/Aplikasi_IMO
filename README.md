# Aplikasi Pengumpul Data UPT

MVP sesuai skema pada gambar:
1. Admin/UPT mendaftarkan akun.
2. Login menggunakan UPT + password.
3. Data profil (Nama, NIPP/NIPKWT, Jabatan, UPT) otomatis mengisi form.
4. Tanggal dan foto dicatat dengan timestamp; tanggal dapat disesuaikan sebelum submit.
5. Data menjadi draft.
6. Admin memeriksa dan memverifikasi.
7. Setelah terverifikasi, PDF dibuat sesuai template yang dikonfigurasi admin dan dapat di-upload ke Google Drive.
8. Dashboard agregasi dapat mengambil data dari beberapa folder Google Drive yang dibagikan ke akun Apps Script.

## Komponen
- Frontend: HTML/CSS/JavaScript
- Login & database: Firebase Authentication + Firestore
- Penyimpanan PDF: Google Drive melalui Google Apps Script Web App
- PDF: jsPDF di browser

## 1. Firebase
Buat project Firebase, aktifkan:
- Authentication > Email/Password
- Firestore Database

Buat collection:
- `users/{uid}`
- `submissions/{submissionId}`
- `settings/app`

Isi `users/{uid}` minimal:
```json
{
  "nama": "Nama Pegawai",
  "nipp": "123456789",
  "jabatan": "Jabatan",
  "upt": "UPT Contoh",
  "role": "admin"
}
```

> Untuk produksi, aturan Firestore wajib diperketat. Contoh aturan ada di bagian akhir README.

## 2. Konfigurasi frontend
Salin isi konfigurasi Firebase ke `firebase-config.js`.

Kemudian deploy folder ini ke Vercel/GitHub Pages/hosting statis.

## 3. Google Apps Script
1. Buka Google Drive dengan akun yang akan menjadi penyimpan.
2. Buat folder utama.
3. Buat project Google Apps Script.
4. Salin `apps-script/Code.gs`.
5. Isi `ROOT_FOLDER_ID`.
6. Isi `SOURCE_FOLDER_IDS` dengan folder sumber yang ingin diagregasi. Folder harus dapat diakses oleh akun yang menjalankan Apps Script.
7. Deploy > New deployment > Web app.
8. Execute as: Me.
9. Who has access: Anyone.
10. Salin URL Web App ke `app.js` pada `DRIVE_API_URL`.

## 4. Alur kerja
- User login -> isi form -> simpan draft.
- Admin membuka dashboard -> memeriksa -> klik Verifikasi.
- Setelah status `verified`, tombol Upload PDF aktif.
- PDF dikirim ke Apps Script -> Google Drive.
- Dashboard agregasi dapat menampilkan daftar file dari beberapa folder.

## Catatan keamanan
Versi ini adalah MVP. Untuk penggunaan resmi, tambahkan:
- Firebase Security Rules berbasis role.
- Validasi server-side.
- Pembatasan ukuran dan tipe file.
- Audit log.
- OAuth/Google Identity bila setiap UPT harus mengunggah ke Drive miliknya sendiri.
- Jangan menaruh service-account private key di frontend.
