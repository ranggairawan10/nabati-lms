# ONE GLOBAL HCMS — Modul LMS (Prototipe)

Prototipe Learning Management System untuk ditempelkan sebagai modul di ONE GLOBAL HCMS, Nabati Group.
Stack: **Next.js (Vercel) + Supabase + GitHub**.

Fitur yang sudah jalan di prototipe ini:
- Masuk / daftar (Supabase Auth)
- Katalog kursus dan halaman kursus
- Pemutar video dengan **lanjut tonton dari posisi terakhir** dan pencatatan progres
- Pembaca materi PDF dengan tanda selesai
- Kuis dengan **penilaian di sisi server** (kunci jawaban tidak pernah dikirim ke browser)
- Pencatatan progres dan event belajar (fondasi analitik dan HC AI)
- Isolasi multi-tenant lewat Row Level Security

---

## 1. Siapkan Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan tiga file ini berurutan:
   - `supabase/01_schema.sql` (membuat tabel, RLS, pgvector, bucket storage)
   - `supabase/02_seed.sql` (trigger profil otomatis, fungsi & penilaian kuis)
   - `supabase/03_seed_org_design.sql` (kursus HC: Merancang Organisasi di Era Efisiensi)
   - `supabase/04_admin.sql` (kamus kompetensi, skill matrix peran, klasifikasi modul, data contoh)
   - `supabase/05_dashboard.sql` (target jam, gamifikasi/badge, kenaikan kompetensi otomatis, RPC dashboard)
   - `supabase/06_more_od_courses.sql` (4 kursus OD tambahan, masing-masing 5 bagian berurutan + tes lewati)
   - `supabase/07_video_timing.sql` (penyesuaian titik pertanyaan-dalam-video Bagian 1 Era Efisiensi setelah video bernarasi)
3. Buka **Authentication > Providers > Email** lalu (untuk prototipe) matikan
   "Confirm email" supaya bisa langsung masuk setelah daftar.

## 2. Unggah materi contoh ke Storage

Bucket `course-media` sudah dibuat oleh skema. Unggah dua file dari folder `public/` repo ini
ke bucket tersebut dengan path **persis** seperti berikut (karena seed merujuk ke path ini):

| File di repo            | Tujuan di bucket `course-media`   |
| ----------------------- | --------------------------------- |
| `public/part-1.mp4`     | `org-design/part-1.mp4`           |
| `public/part-2.mp4`     | `org-design/part-2.mp4`           |
| `public/part-3.mp4`     | `org-design/part-3.mp4`           |
| `public/part-4.mp4`     | `org-design/part-4.mp4`           |
| `public/part-5.mp4`     | `org-design/part-5.mp4`           |
| `public/materi-od.pdf`  | `org-design/materi-od.pdf`        |

Cara cepat: di Supabase Studio buka **Storage > course-media > Upload**, buat folder
`org-design`, lalu unggah file-file bagian. (Catatan: file di `public/` hanya salinan sumber untuk
diunggah. Aplikasi memutar media dari Supabase Storage memakai signed URL, bukan dari `public/`.)

## 3. Jalankan lokal

```bash
cp .env.local.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
# dari Supabase > Project Settings > API

npm install
npm run dev
```

Buka `http://localhost:3000`, klik **Daftar**, buat akun, lalu Anda akan masuk ke katalog
dan menemukan kursus "Merancang Organisasi di Era Efisiensi".

## Panel Admin

Buka `/admin` (hanya untuk peran `org_admin`, `super_admin`, atau `instructor`; tombol "Panel Admin"
juga ada di header mode belajar). Panel ini mengikuti alur TNA: Kompetensi, lalu skill matrix, lalu modul.

- **Kamus Kompetensi** — kelola kompetensi teknikal dan perilaku (Inti, Kepemimpinan, Peran), level 1-5.
- **Peran & Skill Matrix** — buat peran/jabatan dan tetapkan kompetensi serta level yang dibutuhkan.
- **Modul / Kursus** — buat modul, tandai Wajib / Berbasis Peran / Bebas. Editor tiap modul bisa
  mengaitkan kompetensi (kaitan TNA), membuat sesi, menambah pelajaran (video/pdf/kuis/teks), serta
  menginput soal kuis dan pertanyaan-dalam-video.
- **Assign Pelatihan** — tugaskan modul ke karyawan tertentu atau ke sebuah peran, dengan tenggat,
  dan opsi menandai wajib.
- **Learning Path** — rangkai beberapa modul menjadi satu jalur belajar.

Catatan: agar "assign ke peran" menemukan sasaran, kaitkan dulu karyawan ke peran lewat SQL untuk
prototipe ini, misalnya:
```sql
update public.profiles set job_role_id = '7a000000-0000-0000-0000-000000000001'
where email = 'email-karyawan@nabati.co.id';
```

## Dashboard Karyawan

Halaman `/courses/dashboard` adalah beranda learner. Ia memanggil satu RPC `get_my_dashboard()`
yang menghitung semuanya di server, dan menampilkan dua kondisi otomatis: tampilan Hari Pertama
untuk karyawan baru (tanpa angka nol, hanya satu ajakan dan profil skill yang dituju), dan tampilan
penuh untuk karyawan yang sudah aktif.

Empat penopang backend yang dipasang di `05_dashboard.sql`:
- **Jam belajar & target.** Dihitung dari `lessons.duration_seconds` pelajaran yang selesai,
  dibandingkan `profiles.annual_hours_goal` (default 50 jam).
- **Gamifikasi.** Poin (10 per pelajaran selesai, 50 per kuis lulus), tingkat Beginner sampai Master,
  streak harian dari `learning_events`, dan badge dari katalog `badges` yang diraih sesuai aturan.
- **Kenaikan kompetensi otomatis.** Trigger pada `enrollments`: saat sebuah kursus berstatus
  `completed`, level kompetensi karyawan di `user_competencies` naik sesuai `course_competencies`.
  Inilah yang membuat capaian skill matrix dan kesenjangan terisi sendiri.
- **Rekomendasi HC AI (tahap aturan).** Mengusulkan modul yang menutup kesenjangan terbesar terhadap
  standar peran, mengabaikan modul yang sudah selesai. Kolom embedding `pgvector` sudah ada untuk
  versi Netflix-style penuh menyusul.

## Menambah Kursus OD (paket lanjutan, 5 bagian + narasi)

File `06_more_od_courses.sql` menambah empat kursus Organization Design, masing-masing kini berformat
lima bagian berurutan persis seperti kursus Era Efisiensi: lima video bagian yang diselingi kuis per
bagian, ditutup materi PDF, plus Tes Lewati. Semua video sudah bernarasi suara berbahasa Indonesia.
Skrip ini idempoten, artinya aman dijalankan ulang karena akan mereset isi keempat kursus lalu mengisi
ulang. File `07_video_timing.sql` menggeser titik pertanyaan-dalam-video Bagian 1 kursus Era Efisiensi
agar pas dengan video yang sudah bernarasi.

Mengaktifkan semuanya di aplikasi yang sudah online, tanpa perlu deploy ulang Vercel:
1. Jalankan `06_more_od_courses.sql` lalu `07_video_timing.sql` di Supabase SQL Editor.
2. Unggah seluruh isi folder `public` ke Storage bucket `course-media`, ke dalam folder `public`
   (timpa bila diminta). Mencakup video bernarasi kursus pertama `part-1.mp4` sampai `part-5.mp4`,
   dua puluh video bagian kursus baru `ops-model-1.mp4` sampai `human-ai-5.mp4`, serta empat PDF
   `ops-model.pdf`, `star-model.pdf`, `workload.pdf`, dan `human-ai.pdf`.

Setelah itu, segarkan aplikasi. Lima kursus tampil di katalog, semua video bersuara, dan kursus baru
berjalan bertahap dengan kuis di tiap bagian.

## 4. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di [vercel.com](https://vercel.com), **Import** repo tersebut.
3. Tambahkan dua Environment Variables yang sama seperti `.env.local`.
4. Deploy. Vercel akan otomatis build ulang setiap kali Anda push.

---

## Catatan teknis

- **Peran pengguna.** Setiap akun baru otomatis jadi `learner` di organisasi Nabati.
  Untuk mencoba peran pembuat konten / admin, naikkan peran lewat SQL:
  ```sql
  update public.profiles set role = 'org_admin'
  where email = 'email-anda@nabati.co.id';
  ```
- **Bagian berurutan & Tes Lewati.** Kursus "Merancang Organisasi" disetel berurutan: tiap
  bagian terbuka setelah kuis sebelumnya lulus. Ini diatur lewat data, bukan kode, yaitu kolom
  `courses.sequential` dan `courses.placement_assessment_id`, serta `assessments.passing_score`
  (disetel 80). Untuk membuat kursus bebas urutan, cukup set `sequential = false`. Tes Lewati
  dengan skor 80+ membuka semua bagian sekaligus.
- **Pertanyaan di dalam video.** Bagian 1 punya contoh pertanyaan ber-cap-waktu (detik ke-8 dan
  ke-14). Video berhenti otomatis, peserta wajib menjawab benar untuk melanjutkan. Disimpan di
  tabel `video_questions`, dengan jawaban diperiksa di server (fungsi `check_video_answer`).
- **HC AI.** Kolom `embedding` (pgvector) sudah disiapkan di `courses` dan `lessons`.
  Rekomendasi dan pencarian semantik tinggal mengisi kolom ini, tanpa mengubah skema.
- **Integrasi ONE GLOBAL HCMS.** `profiles.employee_id` adalah titik sambung ke data karyawan
  induk. Saat SSO disiapkan, login Supabase Auth diganti tanpa membongkar tabel.
- **Menuju produksi.** Untuk video skala besar, pindahkan dari Supabase Storage ke layanan
  video khusus (Mux / Cloudflare Stream). Penilaian kuis sudah di server lewat fungsi
  `submit_quiz`, jadi aman untuk dilanjutkan.

## Struktur

```
app/                  halaman (login, courses, courses/[id])
components/           VideoPlayer, PdfViewer, Quiz
lib/supabase/         koneksi Supabase di browser
middleware.ts         penjaga sesi / proteksi route
supabase/01_schema.sql  skema inti + RLS + pgvector
supabase/02_seed.sql    trigger profil, fungsi & penilaian kuis
public/               materi contoh (mp4 & pdf) untuk diunggah ke Storage
```
