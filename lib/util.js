const KAS = parseInt(process.env.KAS_PER_WEEK || '5000', 10);
const START_YEAR = parseInt(process.env.ACADEMIC_START_YEAR || '2026', 10);
const START_MONTH = parseInt(process.env.ACADEMIC_START_MONTH || '10', 10); // 10 = Oktober
const MONTHS = parseInt(process.env.MONTHS_COUNT || '9', 10);
const FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OKT','NOV','DES'];
const DSHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

// Periode kas: mulai ACADEMIC_START_MONTH/ACADEMIC_START_YEAR selama MONTHS_COUNT bulan (default Okt 2026 - Jun 2027)
const periods = Array.from({ length: MONTHS }, (_, i) => {
  const idx = START_MONTH - 1 + i, m = idx % 12 + 1, y = START_YEAR + Math.floor(idx / 12);
  return { year: y, month: m, label: FULL[m - 1], short: SHORT[m - 1] };
});

const rp = n => 'Rp.' + Number(n || 0).toLocaleString('id-ID');
const rpSpace = n => 'Rp. ' + Number(n || 0).toLocaleString('id-ID');
const fmtDate = s => { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${+d} ${DSHORT[+m - 1]} ${y}`; };
const today = () => new Date().toISOString().slice(0, 10);
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const periodLabel = (y, m, w) => `M${w} ${FULL[m - 1]} ${y}`;
const enc = s => encodeURIComponent(s);

module.exports = { KAS, START_YEAR, FULL, SHORT, periods, rp, rpSpace, fmtDate, today, isDate, periodLabel, enc };
