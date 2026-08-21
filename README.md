# Pos Pantau

Aplikasi web monitoring keamanan titik. Frontend React (Vite), backend Google
Apps Script + Google Sheets + Google Drive (untuk foto).

## Struktur

- `src/App.jsx` — UI aplikasi (dashboard, form laporan, kelola titik pantau)
- `src/api.js` — pemanggil Web App Apps Script kamu (`API_URL`)
- `.github/workflows/deploy.yml` — build otomatis & deploy ke GitHub Pages tiap push ke `main`

## Menjalankan lokal

```bash
npm install
npm run dev
```

## Deploy ke GitHub Pages

1. Buat repo baru di GitHub, misal `pos-pantau`.
2. Di folder project ini:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<username>/pos-pantau.git
   git push -u origin main
   ```
3. Di repo GitHub: **Settings → Pages → Build and deployment → Source**, pilih
   **GitHub Actions**. (Cukup sekali saja, workflow-nya sudah disiapkan.)
4. Push ke `main` akan otomatis men-trigger workflow `deploy.yml`, yang build
   project lalu publish ke GitHub Pages. Cek progressnya di tab **Actions**.
5. Setelah selesai, URL situs muncul di **Settings → Pages**, formatnya
   `https://<username>.github.io/pos-pantau/`.

## Menghubungkan ke backend Apps Script

`src/api.js` sudah diisi dengan URL Web App kamu:
```
https://script.google.com/macros/s/AKfycbzFmxmqAvx1rc5jR00yoDdP12In2-XI28PnsSqiOHBAnMl3iM6k6h2br7Ni0CIx9Dhx/exec
```
Kalau kamu **Deploy ulang** (bukan "Manage deployments → Edit" versi yang
sama) di Apps Script, URL-nya bisa berubah — tinggal update baris `API_URL`
di `src/api.js`, commit, push, selesai.

Pastikan deployment Apps Script diset **Execute as: Me** dan **Who has
access: Anyone**, supaya bisa dipanggil dari domain GitHub Pages.

## Catatan

- Hapus titik pantau saat ini dilakukan langsung di sheet **Daftar Titik**
  (belum ada endpoint hapus di backend), supaya riwayat laporan di **Rekap**
  tetap konsisten.
- Foto dikompres di browser sebelum dikirim, lalu disimpan Apps Script ke
  folder Google Drive yang sudah diset di `CONFIG.FOLDER_FOTO_ID` (`conf.gs`).
