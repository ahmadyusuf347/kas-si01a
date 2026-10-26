const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { q } = require('../lib/db');
const { KAS, periods, today, isDate, enc } = require('../lib/util');
const exporter = require('../lib/export');

const back = (res, path, msg, err) => res.redirect(`${path}?${err ? 'err=' + enc(err) : 'msg=' + enc(msg)}`);
const amt = v => { const n = parseInt(v, 10); return n > 0 ? n : null; };

/* ---------- INCOME ---------- */
router.get('/income', async (req, res) => {
  const { name = '', from = '', to = '' } = req.query;
  const params = [`%${name}%`];
  let where = 's.name ilike $1';
  if (isDate(from)) { params.push(from); where += ` and i.paid_date >= $${params.length}`; }
  if (isDate(to)) { params.push(to); where += ` and i.paid_date <= $${params.length}`; }
  const rows = await q(`select i.*, s.name from incomes i join students s on s.id=i.student_id
                        where ${where} order by i.paid_date desc, i.id desc limit 500`, params);
  const students = await q('select id, nim, name from students order by nim');
  const paidRows = await q('select student_id, period_year y, period_month m, week w from incomes');
  const paidMap = {};
  paidRows.forEach(r => (paidMap[r.student_id] ||= []).push(`${r.y}-${r.m}-${r.w}`));
  res.render('income', { title: 'Income', active: '/income', rows, total: rows.reduce((a, r) => a + r.amount, 0), students, paidMap, periods, f: { name, from, to }, today: today() });
});

router.post('/income', async (req, res) => {
  const { student_id, paid_date } = req.body;
  const weeks = [].concat(req.body.weeks || []);
  const valid = new Set(periods.flatMap(p => [1, 2, 3, 4].map(w => `${p.year}-${p.month}-${w}`)));
  const picked = weeks.filter(w => valid.has(w));
  if (!student_id || !isDate(paid_date) || !picked.length) return back(res, '/income', '', 'Pilih mahasiswa, tanggal, dan minimal satu minggu');
  let added = 0;
  for (const w of picked) {
    const [y, m, wk] = w.split('-').map(Number);
    const r = await q(`insert into incomes(student_id,period_year,period_month,week,amount,paid_date)
                       values($1,$2,$3,$4,$5,$6) on conflict do nothing returning id`, [student_id, y, m, wk, KAS, paid_date]);
    added += r.length;
  }
  back(res, '/income', `${added} pembayaran minggu berhasil disimpan`);
});

router.post('/income/:id/edit', async (req, res) => {
  const n = amt(req.body.amount);
  if (!n || !isDate(req.body.paid_date)) return back(res, '/income', '', 'Data tidak valid');
  await q('update incomes set amount=$1, paid_date=$2 where id=$3', [n, req.body.paid_date, req.params.id]);
  back(res, '/income', 'Pemasukan diperbarui');
});

router.post('/income/:id/delete', async (req, res) => {
  await q('delete from incomes where id=$1', [req.params.id]);
  back(res, '/income', 'Pemasukan dihapus');
});

/* ---------- OUTCOME ---------- */
router.get('/outcome', async (req, res) => {
  const { name = '', from = '', to = '' } = req.query;
  const params = [`%${name}%`];
  let where = 'description ilike $1';
  if (isDate(from)) { params.push(from); where += ` and spent_date >= $${params.length}`; }
  if (isDate(to)) { params.push(to); where += ` and spent_date <= $${params.length}`; }
  const rows = await q(`select * from outcomes where ${where} order by spent_date desc, id desc limit 500`, params);
  res.render('outcome', { title: 'Outcome', active: '/outcome', rows, total: rows.reduce((a, r) => a + r.amount, 0), f: { name, from, to }, today: today() });
});

router.post('/outcome', async (req, res) => {
  const { description, amount, spent_date } = req.body;
  if (!description?.trim() || !amt(amount) || !isDate(spent_date)) return back(res, '/outcome', '', 'Data tidak valid');
  await q('insert into outcomes(description,amount,spent_date) values($1,$2,$3)', [description.trim(), amt(amount), spent_date]);
  back(res, '/outcome', 'Pengeluaran disimpan');
});

router.post('/outcome/:id/edit', async (req, res) => {
  const { description, amount, spent_date } = req.body;
  if (!description?.trim() || !amt(amount) || !isDate(spent_date)) return back(res, '/outcome', '', 'Data tidak valid');
  await q('update outcomes set description=$1, amount=$2, spent_date=$3 where id=$4', [description.trim(), amt(amount), spent_date, req.params.id]);
  back(res, '/outcome', 'Pengeluaran diperbarui');
});

router.post('/outcome/:id/delete', async (req, res) => {
  await q('delete from outcomes where id=$1', [req.params.id]);
  back(res, '/outcome', 'Pengeluaran dihapus');
});

/* ---------- PROFILE ---------- */
router.get('/profile', async (req, res) => {
  const students = await q('select id, nim, name from students order by nim');
  res.render('profile', { title: 'Profile', active: '/profile', students });
});

router.post('/profile/students', async (req, res) => {
  const nim = (req.body.nim || '').trim(), name = (req.body.name || '').trim();
  if (!/^\d{5,20}$/.test(nim) || !name) return back(res, '/profile', '', 'NIM (angka) dan nama wajib diisi');
  try { await q('insert into students(nim,name) values($1,$2)', [nim, name]); }
  catch (e) { return back(res, '/profile', '', e.code === '23505' ? 'NIM sudah terdaftar' : 'Gagal menyimpan'); }
  back(res, '/profile', 'Mahasiswa ditambahkan');
});

router.post('/profile/students/:id/delete', async (req, res) => {
  await q('delete from students where id=$1', [req.params.id]);
  back(res, '/profile', 'Mahasiswa beserta riwayat pembayarannya dihapus');
});

router.post('/profile/password', async (req, res) => {
  const { old_password = '', new_password = '', confirm = '' } = req.body;
  if (new_password.length < 8) return back(res, '/profile', '', 'Password baru minimal 8 karakter');
  if (new_password !== confirm) return back(res, '/profile', '', 'Konfirmasi password tidak cocok');
  const [u] = await q('select * from users where id=$1', [req.user.id]);
  if (!u || !(await bcrypt.compare(old_password, u.password_hash))) return back(res, '/profile', '', 'Password lama salah');
  await q('update users set password_hash=$1 where id=$2', [await bcrypt.hash(new_password, 10), u.id]);
  back(res, '/profile', 'Password berhasil diganti');
});

/* ---------- EXPORT ---------- */
router.get('/export/excel', async (req, res) => exporter.excel(res));
router.get('/export/pdf', async (req, res) => exporter.pdf(res));

module.exports = router;
