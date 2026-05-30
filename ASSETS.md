# Daftar Aset Visual (ASSETS.md)

Semua aset diletakkan di `public/assets/...`. Kode membaca file dengan **nama persis** di bawah ini. Kalau file belum ada, tampilan **tidak rusak**: komponen otomatis memakai gradien dan ikon sebagai cadangan. Jadi Anda bisa menambah PNG satu per satu kapan saja.

Format yang disarankan: **PNG**. Untuk thumbnail pakai latar penuh (boleh ada warna). Untuk ilustrasi hero, badge, avatar, dan empty state pakai **latar transparan**.

---

## 1. Thumbnail kursus (sudah terhubung ke kode)

Dipakai di kartu katalog dan header kursus. Rasio **16:9**, ukuran **1200 x 675 px** (aman untuk layar retina), akan dipotong `cover`.

| Kursus | Letakkan file di |
| --- | --- |
| Merancang Organisasi di Era Efisiensi | `public/assets/thumbs/od-efisiensi.png` |
| Model Operasi dan Struktur | `public/assets/thumbs/model-operasi.png` |
| Star Model Galbraith | `public/assets/thumbs/star-model.png` |
| Analisis Beban Kerja dan Desain Peran | `public/assets/thumbs/beban-kerja.png` |
| Merancang Peran Manusia dan Agen AI | `public/assets/thumbs/manusia-ai.png` |

Kalau menambah kursus baru, slug thumbnail dibuat otomatis dari judul. Beri tahu saya judulnya, nanti saya kunci nama filenya supaya pasti cocok.

---

## 2. Aset opsional (saya tinggal wire-kan kalau Anda mau)

Belum dipasang di kode, tapi folder dan promptnya sudah disiapkan. Begitu Anda taruh filenya, beri tahu saya, nanti saya sambungkan.

| Aset | File | Ukuran | Catatan |
| --- | --- | --- | --- |
| Ilustrasi hero | `public/assets/hero/hero.png` | 1400 x 1000 px, transparan | Tampil di sisi kanan hero pada layar lebar |
| Tekstur latar | `public/assets/patterns/grain.png` | 600 x 600 px, transparan, tileable | Overlay halus untuk kedalaman |
| Badge pencapaian | `public/assets/badges/badge-1.png` ... `badge-5.png` | 512 x 512 px, transparan | Untuk dashboard dan sertifikat |
| Ilustrasi empty state | `public/assets/empty/empty.png` | 800 x 600 px, transparan | Saat katalog atau hasil pencarian kosong |
| Avatar default | `public/assets/avatars/default.png` | 256 x 256 px, transparan | Pengganti inisial pengguna |
| Logo Nabati | `public/assets/brand/nabati-logo.png` | sudah terpasang (latar transparan) | Tampil di pojok kiri atas navigasi |

---

## Cara pakai
1. Generate gambar di ChatGPT memakai prompt di `PROMPTS.md`.
2. Simpan dengan nama persis seperti tabel di atas, taruh di folder yang ditunjuk.
3. Commit dan push. Karena gambar dibaca dari folder publik aplikasi, tidak perlu mengubah database.
