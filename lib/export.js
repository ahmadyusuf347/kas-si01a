const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { q } = require('./db');
const { periods, periodLabel, fmtDate, rpSpace } = require('./util');

async function load() {
  const [students, incomes, outcomes] = await Promise.all([
    q('select id, nim, name from students order by nim'),
    q('select i.*, s.name, s.nim from incomes i join students s on s.id=i.student_id order by i.paid_date, i.id'),
    q('select * from outcomes order by spent_date, id'),
  ]);
  const paid = {}, sum = {};
  incomes.forEach(i => {
    paid[`${i.student_id}-${i.period_year}-${i.period_month}-${i.week}`] = 1;
    sum[i.student_id] = (sum[i.student_id] || 0) + i.amount;
  });
  const tin = incomes.reduce((a, r) => a + r.amount, 0), tout = outcomes.reduce((a, r) => a + r.amount, 0);
  return { students, incomes, outcomes, paid, sum, tin, tout };
}

exports.excel = async res => {
  const d = await load();
  const wb = new ExcelJS.Workbook();
  const head = { font: { bold: true, color: { argb: 'FFB2EC75' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17451A' } }, alignment: { horizontal: 'center' } };
  const style = row => row.eachCell(c => Object.assign(c, head));

  const s1 = wb.addWorksheet('Ringkasan');
  s1.addRows([['Kas Kelas SI01A'], [], ['Total Pemasukan', d.tin], ['Total Pengeluaran', d.tout], ['Saldo Kas', d.tin - d.tout]]);
  s1.getRow(1).font = { bold: true, size: 14 }; s1.getColumn(1).width = 24; s1.getColumn(2).width = 18;
  s1.getColumn(2).numFmt = '"Rp" #,##0';

  const s2 = wb.addWorksheet('Rekap Pembayaran');
  s2.addRow(['No', 'NIM', 'Mahasiswa', ...periods.flatMap(p => [p.label, '', '', '']), 'Total (Rp)']);
  s2.addRow(['', '', '', ...periods.flatMap(() => ['M1', 'M2', 'M3', 'M4']), '']);
  periods.forEach((_, i) => s2.mergeCells(1, 4 + i * 4, 1, 7 + i * 4));
  [1, 2].forEach(r => style(s2.getRow(r)));
  d.students.forEach((s, idx) => {
    const cells = periods.flatMap(p => [1, 2, 3, 4].map(w => (d.paid[`${s.id}-${p.year}-${p.month}-${w}`] ? '✓' : '')));
    const row = s2.addRow([idx + 1, s.nim, s.name, ...cells, d.sum[s.id] || 0]);
    row.eachCell((c, n) => { if (c.value === '✓') { c.alignment = { horizontal: 'center' }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB2EC75' } }; } });
    row.getCell(4 + 36).numFmt = '#,##0';
  });
  s2.getColumn(2).width = 16; s2.getColumn(3).width = 36;
  for (let c = 4; c < 40; c++) s2.getColumn(c).width = 5;
  s2.getColumn(40).width = 14; s2.views = [{ state: 'frozen', xSplit: 3, ySplit: 2 }];

  const s3 = wb.addWorksheet('Pemasukan');
  style(s3.addRow(['Tanggal', 'NIM', 'Mahasiswa', 'Periode', 'Nominal']));
  d.incomes.forEach(i => s3.addRow([fmtDate(i.paid_date), i.nim, i.name, periodLabel(i.period_year, i.period_month, i.week), i.amount]));
  s3.addRow(['', '', '', 'TOTAL', d.tin]).font = { bold: true };
  [14, 16, 36, 24, 14].forEach((w, i) => (s3.getColumn(i + 1).width = w)); s3.getColumn(5).numFmt = '#,##0';

  const s4 = wb.addWorksheet('Pengeluaran');
  style(s4.addRow(['Tanggal', 'Keterangan', 'Nominal']));
  d.outcomes.forEach(o => s4.addRow([fmtDate(o.spent_date), o.description, o.amount]));
  s4.addRow(['', 'TOTAL', d.tout]).font = { bold: true };
  [14, 44, 14].forEach((w, i) => (s4.getColumn(i + 1).width = w)); s4.getColumn(3).numFmt = '#,##0';

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rekap-kas-SI01A.xlsx"');
  await wb.xlsx.write(res);
  res.end();
};

exports.pdf = async res => {
  const d = await load();
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rekap-kas-SI01A.pdf"');
  doc.pipe(res);

  const row = (widths, vals, bold) => {
    if (doc.y > 770) doc.addPage();
    const y = doc.y; let x = 40;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor('#17451a');
    vals.forEach((v, i) => { doc.text(String(v), x + 2, y, { width: widths[i] - 4, lineBreak: false, ellipsis: true }); x += widths[i]; });
    doc.moveTo(40, y + 13).lineTo(555, y + 13).strokeColor('#dddddd').stroke();
    doc.x = 40; doc.y = y + 16;
  };

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#17451a').text('Rekap Uang Kas Kelas SI01A');
  doc.font('Helvetica').fontSize(9).fillColor('#555').text('Dicetak: ' + fmtDate(new Date().toISOString().slice(0, 10))).moveDown(0.8);
  doc.fontSize(11).fillColor('#17451a')
    .text('Total Pemasukan   : ' + rpSpace(d.tin)).text('Total Pengeluaran : ' + rpSpace(d.tout))
    .font('Helvetica-Bold').text('Saldo Kas              : ' + rpSpace(d.tin - d.tout)).moveDown(1);

  doc.font('Helvetica-Bold').fontSize(12).text('Rekap Pembayaran (minggu lunas per bulan)').moveDown(0.4);
  const w1 = [22, 148, ...periods.map(() => 30), 75];
  row(w1, ['No', 'Mahasiswa', ...periods.map(p => p.short), 'Total'], true);
  d.students.forEach((s, i) => row(w1, [i + 1, s.name,
    ...periods.map(p => [1, 2, 3, 4].filter(w => d.paid[`${s.id}-${p.year}-${p.month}-${w}`]).length + '/4'),
    rpSpace(d.sum[s.id] || 0)]));

  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#17451a').text('Pengeluaran').moveDown(0.4);
  const w2 = [80, 335, 100];
  row(w2, ['Tanggal', 'Keterangan', 'Nominal'], true);
  if (!d.outcomes.length) row(w2, ['-', 'Belum ada pengeluaran', '-']);
  d.outcomes.forEach(o => row(w2, [fmtDate(o.spent_date), o.description, rpSpace(o.amount)]));
  row(w2, ['', 'TOTAL', rpSpace(d.tout)], true);
  doc.end();
};
