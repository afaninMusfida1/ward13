# 🏥 WARD 13 — Abandoned Hospital VR

> Game horor berbasis WebXR/VR yang dimainkan langsung di browser, dibangun dengan **A-Frame** dan **Web Audio API**.

![Status](https://img.shields.io/badge/status-playable-brightgreen)
![Platform](https://img.shields.io/badge/platform-WebXR%20%7C%20Desktop-blue)
![License](https://img.shields.io/badge/license-Educational-lightgrey)

**🎮 Demo Online:** [ward13-three.vercel.app](https://ward13-three.vercel.app/)

---

## 📖 Tentang Game

**Ward 13** adalah game horor survival pendek berlatar Rumah Sakit Jiwa Semarang, Sayap Barat, tahun 1987. Pemain terbangun sendirian di lorong rumah sakit yang gelap dan harus mengumpulkan dokumen rahasia untuk membuka jalan keluar — sambil dikejar waktu dan diteror oleh sosok badut yang muncul tiba-tiba di kegelapan.

Proyek ini dibuat sebagai **tugas kelompok** untuk mengeksplorasi pengembangan pengalaman VR/WebXR yang dapat diakses langsung dari browser tanpa instalasi aplikasi tambahan — baik di desktop maupun headset VR (Meta Quest dan perangkat WebXR-compatible lainnya).

### Cerita & Objektif

- Temukan **3 dokumen rahasia** yang tersebar di lorong rumah sakit
- Setelah ketiga dokumen terkumpul, **kunci** akan muncul di ujung lorong
- Ambil kunci untuk membuka **pintu keluar darurat**
- Selesaikan semua itu dalam **8 menit** sebelum waktu habis
- Jaga **tingkat ketenangan (sanity)** — jika menyentuh nol akibat teror berulang, permainan berakhir

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 🕹️ **Kontrol Desktop** | WASD untuk berjalan, mouse untuk melihat sekitar, tombol `E` untuk interaksi |
| 🥽 **Dukungan VR/WebXR** | Kompatibel dengan headset VR (Meta Quest, dll) — thumbstick kiri untuk berjalan, trigger untuk interaksi |
| 👻 **Sistem Jumpscare** | Sosok badut muncul secara progresif (jauh → dekat → sangat dekat) dengan efek visual dan audio yang meningkat intensitasnya |
| 🔊 **Audio Prosedural** | Seluruh efek suara (langkah kaki, jantung berdebar, stinger jumpscare, ambient horor) di-generate secara real-time menggunakan Web Audio API — tanpa file audio eksternal |
| 📄 **Sistem Dokumen & Lore** | Dokumen yang dapat dibaca untuk membangun narasi cerita |
| 🧠 **Sanity System** | Tingkat ketenangan menurun seiring waktu dan teror; mempengaruhi efek visual (distorsi, flicker) |
| ⏱️ **Time Pressure** | Batas waktu 8 menit menciptakan tekanan dan urgensi |
| 🎨 **Efek Visual Atmosferik** | Flicker lampu, vignette, efek static/glitch saat jumpscare |

---

## 🛠️ Tech Stack

- **[A-Frame](https://aframe.io/) 1.5.0** — Framework WebVR/WebXR berbasis HTML, dibangun di atas Three.js
- **[aframe-extras](https://github.com/c-frame/aframe-extras) 7.2.0** — Komponen tambahan A-Frame
- **Three.js 0.158.0** — Engine rendering 3D (bundled di dalam A-Frame)
- **Web Audio API** — Audio prosedural tanpa file statis
- **Vanilla JavaScript** — Game logic & state management, tanpa framework tambahan
- **HTML5 / CSS3** — UI overlay (menu, HUD, dialog dokumen)
- **Vercel** — Hosting & deployment (static site, HTTPS otomatis untuk WebXR)

Tidak ada proses build/bundling — seluruh project adalah file statis yang bisa langsung dijalankan dari web server sederhana.

---

## 📁 Struktur Project

```
VR-Hospital/
├── index.html              # Scene utama A-Frame + struktur entity 3D
├── css/
│   └── ui.css               # Styling menu, HUD, dialog dokumen, efek visual
├── js/
│   ├── game.js               # State machine, gameplay logic, locomotion, jumpscare system
│   └── audio.js              # Audio engine prosedural (Web Audio API)
└── assets/
    ├── models/
    │   └── clown.glb         # Model 3D karakter antagonis
    └── textures/
        ├── wall.jpg
        ├── floor.jpg
        └── ceiling.jpg
```

---

## 🚀 Cara Menjalankan

### Opsi 1 — Coba langsung di browser (tanpa setup)

👉 **[ward13-three.vercel.app](https://ward13-three.vercel.app/)**

Bisa langsung dicoba dari desktop maupun headset VR (buka link ini dari browser di dalam headset).

### Opsi 2 — Jalankan secara lokal

Karena memuat aset (model 3D, texture) lewat path relatif, project ini perlu dijalankan melalui local web server — **tidak bisa** dibuka langsung lewat `file://`.

```bash
# Clone repository
git clone <url-repo-ini>
cd VR-Hospital

# Jalankan local server — pilih salah satu:

# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

Lalu buka browser ke `http://localhost:8000`.

> ⚠️ **Catatan kompatibilitas:** jika layar muncul hitam/kosong, kemungkinan WebGL hardware acceleration nonaktif di browser kamu. Cek di `chrome://gpu` (atau `edge://gpu`) dan pastikan WebGL/WebGL2 berstatus aktif. Browser seperti Edge dan Brave biasanya bekerja tanpa masalah secara default; beberapa instalasi Chrome (terutama di laptop kantor/kampus dengan policy IT tertentu) bisa memiliki GPU acceleration yang di-nonaktifkan.

---

## 🎮 Kontrol

### Desktop
| Input | Aksi |
|---|---|
| `W A S D` | Berjalan |
| Mouse | Melihat sekitar (klik dulu untuk mengaktifkan) |
| `E` | Ambil item / Baca dokumen / Interaksi |
| `ESC` | Lepas kontrol mouse |

### VR (Headset/WebXR)
| Input | Aksi |
|---|---|
| Thumbstick kiri | Berjalan / strafe |
| Trigger (kiri/kanan) | Interaksi (ambil/baca) |
| Gerakan kepala | Melihat sekitar (head tracking native) |

> Mode VR diakses lewat tombol "Enter VR" yang muncul otomatis di scene saat dibuka dari browser/device yang mendukung WebXR (misalnya Meta Quest Browser di headset Quest).

---

## 🧩 Catatan Pengembangan

Beberapa hal teknis yang relevan jika ingin melanjutkan/memodifikasi project ini:

- **Animasi karakter badut bersifat statis (bind pose)**, bukan skeletal animation. Animasi skeletal asli pada model GLB (`Clown_Springtrap--Jumpscare`) ditemukan menyebabkan mesh collapse saat dijalankan melalui A-Frame + `aframe-extras`, sehingga efek "jumpscare" dibuat melalui animasi transform (scale jolt + jitter rotasi) di level entity, bukan animasi tulang.
- **Arah hadap pemain** dihitung dari world direction kamera (bukan rotation attribute parent entity), agar tetap akurat baik di mode desktop maupun saat sesi WebXR aktif (karena pose head di WebXR ditulis langsung ke object3D kamera, bukan ke parent rig).
- **Testing locomotion VR di emulator browser** (seperti Immersive Web Emulator) diketahui tidak selalu merepresentasikan kondisi sebenarnya secara visual saat rig/kamera berpindah posisi — disarankan pengujian akhir locomotion dilakukan di headset VR fisik.
- **WebXR membutuhkan HTTPS** (kecuali di `localhost`), sehingga deployment ke hosting seperti Vercel/Netlify diperlukan untuk pengujian VR di luar mesin development.

---

## 👥 Tim Pengembang

Proyek ini dikembangkan sebagai tugas kelompok beranggotakan 5 orang:

| Nama | NIM |
|---|---|
| Afanin Musfida | 3.34.25.0.02 |
| Ayudya Lintang K | 3.34.25.0.05 |
| Dea Fransisca | 3.34.25.0.06 |
| Nabilla Fausta M | 3.34.25.0.20 |
| Zahra Auliya | 3.34.25.0.25 | 


---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan akademik/tugas kelompok dan tidak ditujukan untuk distribusi komersial.

---

## 🙏 Kredit & Aset

- Framework: [A-Frame](https://aframe.io/) oleh Supermedium
- Komponen tambahan: [aframe-extras](https://github.com/c-frame/aframe-extras)
- Model 3D karakter **"Clown Springtrap Jumpscare"** oleh [OrangeSauceu](https://sketchfab.com/orangesauceu) via Sketchfab — dilisensikan di bawah [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). [Sumber asli](https://sketchfab.com/3d-models/clown-springtrap-jumpscare-7c87ef82d11742728151190ea1b07041).
