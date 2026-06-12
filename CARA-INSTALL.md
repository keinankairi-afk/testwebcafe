# Sibabu Cafe — Cara Install & Menjalankan

Aplikasi web cafe (menu pelanggan + panel admin/kasir) dibangun dengan:
React + Vite + Tailwind, dan **Convex** sebagai database & backend realtime.

> Versi online (tidak perlu install apa-apa):
> https://sibabu-cafe-5b66bb1c.viktor.space
> Login admin awal: username `husin1`, password `Watuagung1`
> (username & password bisa diganti sendiri di Dashboard admin —
> kalau sudah pernah diganti, pakai yang baru)

## Yang dibutuhkan
1. Komputer (Windows/Mac/Linux)
2. **Bun** — https://bun.sh (atau Node.js 20+)
3. Akun **Convex** gratis — https://convex.dev (untuk database)

## Langkah install
```bash
# 1. Ekstrak ZIP ini, lalu masuk ke foldernya
cd sibabu-cafe

# 2. Install dependency
bun install

# 3. Hubungkan ke Convex (login lewat browser, otomatis bikin database)
bunx convex dev
# Biarkan terminal ini tetap jalan

# 4. Di terminal kedua, jalankan webnya
bun run dev
```
Buka http://localhost:5173

## Login admin
- Buka link "Admin" di bagian bawah halaman menu (atau /login)
- Username: `husin1`
- Password: `Watuagung1`
- Ganti password: dari Dashboard admin → kartu **"Ganti Password"** (password lama → password baru, minimal 8 karakter). Tersimpan ter-hash di database.
- Lupa password? Jalankan: `bunx convex run adminAuth:resetAdminPassword '{"newPassword":"PasswordBaru123"}' --prod`

## Fitur
- Menu pelanggan + keranjang + checkout (tanpa login, realtime)
- Pelanggan pilih **nomor meja dari dropdown** saat checkout (sesuai jumlah meja)
- Panel admin: dashboard penjualan, kelola produk & kategori, kelola pesanan
- Pengaturan dari Dashboard admin:
  - Nama cafe/rumah makan
  - Slogan di header menu
  - Tulisan sambutan (judul besar) + teks di bawahnya di halaman menu
  - Jumlah meja (1-200, tambah/kurang)
  - Warna web (6 pilihan: kopi, hijau, biru, ungu, merah, jingga)
  - Ganti username login & ganti password
- Mode terang/gelap

## Build untuk produksi
```bash
bun run build       # hasil di folder dist/
bunx convex deploy  # deploy backend Convex ke production
```
