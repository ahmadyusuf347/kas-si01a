require('dotenv').config();
const fs = require('fs'), path = require('path'), bcrypt = require('bcryptjs');
const { pool } = require('../lib/db');

const RAW = `2627572010001|JUNIOR PUTRA SANTOSA
2627572010002|LULU KAMALUDIN
2627572010003|ARMAN AGUSTIAN
2627572010004|AHMAD YUSUF
2627572010005|HASNI NASTITI SAID
2627572010007|M. HUZAYFAHTUN NAJMI
2627572010008|YOGA ALAM ANWARI
2627572010009|NABHANSYAH YUSUP
2627572010011|RIFKY AKBAR RAMADHAN
2627572010012|ALPIN BUDIANA
2627572010013|MUHAMMAD SYAHYAN RASYID PERMANA
2627572010014|ANNISA NURSALSABILA
2627572010015|DWI PRAJA
2627572010016|RIKI SAPUTRA
2627572010017|PRAYOGA DWI HANDIKA
2627572010019|ALDI FIRANSYAH
2627572010020|RIZKI PRAYOGA
2627572010021|MUHAMAD AZIS RAHMAT
2627572010023|IMAM KOSWARA
2627572010024|ALSENA REGIENALDO PANCASONA WIBOWO
2627572010037|JASIR ADIL SYAOQI
2627572010038|MUHAMAD RIZKY MAULANA SAPUTRA
2627572010042|SYAHRU ALMA'RUF MUZAQI
2627572010045|ANGGRA HIDAYAT
2627572010046|ARDHI RIZALDI
2627572010048|WAHID DICKY NUGROHO`;

const title = s => s.toLowerCase().replace(/(^|[\s.-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

(async () => {
  await pool.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
  for (const line of RAW.split('\n')) {
    const [nim, name] = line.split('|');
    await pool.query('insert into students(nim,name) values($1,$2) on conflict (nim) do nothing', [nim, title(name)]);
  }
  const email = process.env.ADMIN_EMAIL, pass = process.env.ADMIN_PASSWORD;
  if (email && pass) {
    await pool.query('insert into users(email,password_hash) values($1,$2) on conflict (email) do nothing',
      [email.toLowerCase(), await bcrypt.hash(pass, 10)]);
  }
  console.log('Seed selesai: tabel, 26 mahasiswa, admin', email);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
