-- ============================================================
-- KURSUS HC: Merancang Organisasi di Era Efisiensi (5 BAGIAN, BERURUTAN)
-- Alur: Bagian 1 (video) -> Kuis 1 -> Bagian 2 -> Kuis 2 -> ... -> Bagian 5 -> Kuis 5 -> Materi PDF
-- Gerbang: bagian berikutnya terbuka jika kuis sebelumnya lulus (passing_score 80).
-- Tes Lewati: skor >= 80 pada placement test membuka semua bagian sekaligus.
-- Jalankan SETELAH 01_schema.sql dan 02_seed.sql.
-- ============================================================
set check_function_bodies = off;

insert into public.courses (id, organization_id, title, description, level, category,
                            duration_minutes, status, visibility, sequential, placement_assessment_id)
values (
  '1d000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000a1',
  'Merancang Organisasi di Era Efisiensi',
  'Lima bagian tentang desain organisasi yang ramping dan hemat biaya, serta peran agentic AI (HC AI) sebagai pengisi peran dalam struktur. Setiap bagian diuji dengan kuis singkat.',
  'intermediate', 'Human Capital', 25, 'published', 'organization',
  true, '4d000000-0000-0000-0000-0000000000ff'
) on conflict (id) do update set
  sequential = excluded.sequential,
  placement_assessment_id = excluded.placement_assessment_id,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes;

insert into public.modules (id, organization_id, course_id, title, position)
values (
  '2d000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000a1',
  '1d000000-0000-0000-0000-000000000001',
  'Desain Organisasi & Peran HC AI', 0
) on conflict (id) do nothing;

insert into public.lessons (id, organization_id, module_id, title, content_type, storage_path, position) values
 ('3d000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Bagian 1: Efisiensi yang Benar','video','org-design/part-1.mp4',0),
 ('3d000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Kuis Bagian 1','quiz',null,1),
 ('3d000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Bagian 2: Star Model Galbraith','video','org-design/part-2.mp4',2),
 ('3d000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Kuis Bagian 2','quiz',null,3),
 ('3d000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Bagian 3: Tuas Efisiensi Struktural','video','org-design/part-3.mp4',4),
 ('3d000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Kuis Bagian 3','quiz',null,5),
 ('3d000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Bagian 4: HC AI sebagai Pengisi Peran','video','org-design/part-4.mp4',6),
 ('3d000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Kuis Bagian 4','quiz',null,7),
 ('3d000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Bagian 5: Tim Manusia + Agen','video','org-design/part-5.mp4',8),
 ('3d000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Kuis Bagian 5','quiz',null,9),
 ('3d000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000a1','2d000000-0000-0000-0000-000000000001','Materi Lengkap (PDF)','pdf','org-design/materi-od.pdf',10)
on conflict (id) do nothing;

insert into public.assessments (id, organization_id, course_id, lesson_id, title, passing_score, attempt_limit) values
 ('4d000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','1d000000-0000-0000-0000-000000000001','3d000000-0000-0000-0000-000000000002','Kuis Bagian 1',80,5),
 ('4d000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','1d000000-0000-0000-0000-000000000001','3d000000-0000-0000-0000-000000000004','Kuis Bagian 2',80,5),
 ('4d000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','1d000000-0000-0000-0000-000000000001','3d000000-0000-0000-0000-000000000006','Kuis Bagian 3',80,5),
 ('4d000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a1','1d000000-0000-0000-0000-000000000001','3d000000-0000-0000-0000-000000000008','Kuis Bagian 4',80,5),
 ('4d000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000a1','1d000000-0000-0000-0000-000000000001','3d000000-0000-0000-0000-00000000000a','Kuis Bagian 5',80,5),
 ('4d000000-0000-0000-0000-0000000000ff','00000000-0000-0000-0000-0000000000a1','1d000000-0000-0000-0000-000000000001',null,'Tes Lewati (Placement)',80,3)
on conflict (id) do nothing;

insert into public.questions (id, organization_id, assessment_id, type, prompt, options, correct_answer, points, position) values
 ('5d100000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000001','true_false','Memangkas jumlah karyawan tanpa merancang ulang pekerjaan adalah cara paling sehat menghemat biaya.','["Benar","Salah"]'::jsonb,'"Salah"'::jsonb,1,0),
 ('5d100000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000001','mcq','Tujuan utama desain organisasi yang baik adalah...','["Mengurangi jumlah orang secepatnya","Menghasilkan lebih banyak dengan sumber daya lebih sedikit secara berkelanjutan","Menambah lapisan kontrol","Memperbanyak rapat koordinasi"]'::jsonb,'"Menghasilkan lebih banyak dengan sumber daya lebih sedikit secara berkelanjutan"'::jsonb,1,1),
 ('5d200000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000002','mcq','Dalam Star Model Galbraith, titik awal desain adalah...','["Struktur","Strategi","Imbalan","Orang"]'::jsonb,'"Strategi"'::jsonb,1,0),
 ('5d200000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000002','true_false','Mengubah struktur tanpa menyelaraskan proses, imbalan, dan orang berisiko menimbulkan ketidakselarasan.','["Benar","Salah"]'::jsonb,'"Benar"'::jsonb,1,1),
 ('5d300000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000003','mcq','Apa arti delayering?','["Menambah lapisan manajemen","Menghapus lapisan manajemen yang tidak menambah nilai","Memperkecil rentang kendali","Menambah jumlah manajer"]'::jsonb,'"Menghapus lapisan manajemen yang tidak menambah nilai"'::jsonb,1,0),
 ('5d300000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000003','true_false','Melebarkan rentang kendali yang sehat dapat mengurangi jumlah manajer.','["Benar","Salah"]'::jsonb,'"Benar"'::jsonb,1,1),
 ('5d400000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000004','mcq','Peran mana paling tepat diisi HC AI?','["Keputusan dengan konsekuensi etis dan hukum","Koordinasi, pemantauan, dan analisis rutin","Akuntabilitas akhir atas hasil unit","Kepemimpinan dan pemberian makna"]'::jsonb,'"Koordinasi, pemantauan, dan analisis rutin"'::jsonb,1,0),
 ('5d400000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000004','true_false','Agentic AI hanya alat bantu pasif dan tidak dapat memegang alur kerja secara mandiri.','["Benar","Salah"]'::jsonb,'"Salah"'::jsonb,1,1),
 ('5d500000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000005','mcq','Penghematan dari struktur manusia + agen terutama berasal dari...','["Pemotongan menyeluruh","Berkurangnya lapisan plus pengalihan tenaga ke kerja bernilai tinggi","Menambah agen sebanyak mungkin","Menghapus semua manajer"]'::jsonb,'"Berkurangnya lapisan plus pengalihan tenaga ke kerja bernilai tinggi"'::jsonb,1,0),
 ('5d500000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-000000000005','true_false','Meski HC AI mengisi peran dalam struktur, akuntabilitas akhir tetap berada pada manusia.','["Benar","Salah"]'::jsonb,'"Benar"'::jsonb,1,1),
 ('5df00000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-0000000000ff','mcq','Titik awal desain organisasi dalam Star Model adalah...','["Struktur","Strategi","Imbalan","Orang"]'::jsonb,'"Strategi"'::jsonb,1,0),
 ('5df00000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-0000000000ff','true_false','Memangkas tanpa merancang ulang pekerjaan adalah cara paling sehat menghemat biaya.','["Benar","Salah"]'::jsonb,'"Salah"'::jsonb,1,1),
 ('5df00000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-0000000000ff','mcq','Delayering adalah...','["Menambah lapisan","Menghapus lapisan manajemen tanpa nilai","Memperkecil rentang kendali","Menambah manajer"]'::jsonb,'"Menghapus lapisan manajemen tanpa nilai"'::jsonb,1,2),
 ('5df00000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-0000000000ff','mcq','Peran yang tepat diisi HC AI...','["Keputusan etis dan hukum","Koordinasi, pemantauan, analisis rutin","Akuntabilitas akhir","Kepemimpinan"]'::jsonb,'"Koordinasi, pemantauan, analisis rutin"'::jsonb,1,3),
 ('5df00000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000a1','4d000000-0000-0000-0000-0000000000ff','true_false','Akuntabilitas akhir tetap pada manusia meski peran diisi HC AI.','["Benar","Salah"]'::jsonb,'"Benar"'::jsonb,1,4)
on conflict (id) do nothing;

-- Pertanyaan di dalam video untuk Bagian 1 (wajib benar untuk lanjut)
insert into public.video_questions (id, organization_id, lesson_id, at_seconds, type, prompt, options, correct_answer, position) values
 ('6d000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','3d000000-0000-0000-0000-000000000001',8,'mcq',
  'Efisiensi yang benar terutama dicapai dengan...',
  '["Memangkas jumlah orang secepatnya","Merancang ulang pekerjaan dan struktur"]'::jsonb,
  '"Merancang ulang pekerjaan dan struktur"'::jsonb,0),
 ('6d000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','3d000000-0000-0000-0000-000000000001',14,'true_false',
  'Tujuan desain organisasi yang baik adalah menghasilkan lebih banyak dengan sumber daya lebih sedikit.',
  '["Benar","Salah"]'::jsonb,'"Benar"'::jsonb,1)
on conflict (id) do nothing;
