// Membantu mengambil gambar dari Supabase Storage tanpa peduli ekstensinya.
// Mencoba beberapa ekstensi umum lalu mengembalikan signed URL pertama yang ada.
// Dengan begitu, mengunggah JPG, PNG, atau WEBP sama-sama bekerja.

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number
      ) => Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
};

const EXTS = [".jpg", ".jpeg", ".png", ".webp"];

export async function resolveStorageImage(
  supabase: StorageClient,
  basePath: string,
  expiresIn = 3600
): Promise<string | null> {
  for (const ext of EXTS) {
    try {
      const { data, error } = await supabase.storage
        .from("course-media")
        .createSignedUrl(basePath + ext, expiresIn);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {
      // lanjut coba ekstensi berikutnya
    }
  }
  return null;
}
