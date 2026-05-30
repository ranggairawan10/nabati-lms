-- ============================================================
-- Penyesuaian titik pertanyaan-dalam-video Bagian 1 (kursus Era Efisiensi)
-- menyesuaikan durasi video bernarasi (suara Piper id_ID).
-- Jalankan SETELAH 03_seed_org_design.sql.
-- ============================================================
update public.video_questions set at_seconds = 8
 where id = '6d000000-0000-0000-0000-000000000001';
update public.video_questions set at_seconds = 18
 where id = '6d000000-0000-0000-0000-000000000002';
