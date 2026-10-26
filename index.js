require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { attachUser, requireAuth } = require('./lib/auth');
const u = require('./lib/util');

const app = express();
app.engine('ejs', require('ejs').__express);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(attachUser);
app.use((req, res, next) => {
  Object.assign(res.locals, {
    user: req.user, rp: u.rp, rpSpace: u.rpSpace, fmtDate: u.fmtDate, KAS: u.KAS,
    nav: [['/', 'Dashboard', 'bi-house-fill', 'bi-house'], ['/income', 'Income', 'bi-arrow-down-circle-fill', 'bi-arrow-down-circle'], ['/outcome', 'Outcome', 'bi-arrow-up-circle-fill', 'bi-arrow-up-circle'], ['/profile', 'Profile', 'bi-person-fill', 'bi-person']],
    msg: req.query.msg || '', err: req.query.err || '', active: '',
  });
  next();
});

app.use('/', require('./routes/public'));
app.use(['/income', '/outcome', '/profile', '/export'], requireAuth); // wajib login
app.use('/', require('./routes/admin'));

app.use((req, res) => res.status(404).send('Halaman tidak ditemukan'));
app.use((e, req, res, next) => { console.error(e); res.status(500).send('Terjadi kesalahan server'); });

module.exports = app;
if (require.main === module) app.listen(process.env.PORT || 3000, () => console.log('Jalan di http://localhost:' + (process.env.PORT || 3000)));
