# Aturan hemat token (repo ini)

Tujuan: kerja tetap akurat tanpa membengkakkan konteks. Ikuti urutan ini.

1. Mulai dari `node scripts/context-digest.mjs` (ringkasan repo + berkas terbesar).
2. Cari dulu, baca kemudian: `node scripts/ctx.mjs map "<pola>" --max 30`.
3. Baca potongan, bukan berkas utuh: `node scripts/ctx.mjs read <file> <start> <end>` (maks 120 baris).
4. Batasi keluaran terminal di sumbernya (`Select-Object -Last 15`, `--max`, `head`).
5. Jangan membuka `node_modules/`, lockfile, `data/` (DB/sesi WA), atau aset biner.
6. Ringkas hasil panjang jadi ≤3 baris berisi angka/kesimpulan.
7. Saat konteks membesar (>80k token) atau tugas selesai: `node scripts/ctx.mjs handoff --title "..." --status "..." --next "..."`, lalu mulai sesi baru dari `.context/handoff.md`.

Gaya jawaban: terse, bullet/tabel, kutipan kode ≤10 baris, tanpa basa-basi.
