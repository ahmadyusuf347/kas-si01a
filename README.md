# Kas Kelas SI01A

Web app pencatatan uang kas kelas. **Node.js (Express 5) · EJS · Tailwind CSS · Bootstrap Icons · PostgreSQL (Supabase)**. Responsif desktop & mobile.

## Fitur
- **Dashboard (publik)**: grafik per bulan, saldo kas, rekap pembayaran M1–M4 (Sep–Mei) tiap mahasiswa.
- **Login admin** (JWT di cookie httpOnly, password di-hash bcrypt).
- **Income**: pilih mahasiswa + tanggal + minggu (M1–M4 per bulan); 1 minggu = Rp 5.000 (ubah via `KAS_PER_WEEK`). Cari nama, filter tanggal, total tampil, edit & hapus. Minggu yang sudah lunas otomatis terkunci (tidak bisa dobel).
- **Outcome**: keterangan, nominal, tanggal (CRUD + filter).
- **Profile**: tambah/hapus mahasiswa (NIM, nama), ganti password, download rekap **Excel** & **PDF**.

## Struktur
```
index.js            # entry Express (juga dipakai Vercel)
routes/             # public.js (dashboard, login) · admin.js (income, outcome, profile, export)
lib/                # db, auth, util, export (Excel/PDF)
views/              # EJS + Tailwind (CDN)
db/schema.sql       # skema tabel
scripts/seed.js     # buat tabel + 26 mahasiswa + akun admin
docs/               # panduan lengkap
```

## Panduan (baca berurutan)
1. [docs/01-SUPABASE.md](docs/01-SUPABASE.md) – membuat database
2. [docs/02-LOCAL.md](docs/02-LOCAL.md) – menjalankan di lokal
3. [docs/03-GITHUB.md](docs/03-GITHUB.md) – push ke repository
4. [docs/04-VERCEL.md](docs/04-VERCEL.md) – deploy

## Catatan
- Periode kas diatur lewat `ACADEMIC_START_YEAR`, `ACADEMIC_START_MONTH`, `MONTHS_COUNT` (default: mulai Okt 2026, 9 bulan → Okt 2026–Jun 2027).
- Lupa password admin: ganti hash langsung di tabel `users` atau jalankan ulang seed dengan email baru.
