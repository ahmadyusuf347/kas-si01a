const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret-ganti-di-production';
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: !!process.env.VERCEL, maxAge: 7 * 24 * 3600 * 1000 };

exports.sign = (user, res) => res.cookie('token', jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' }), cookieOpts);
exports.clear = res => res.clearCookie('token', { ...cookieOpts, maxAge: undefined });
exports.attachUser = (req, res, next) => {
  try { req.user = jwt.verify(req.cookies.token, SECRET); } catch { req.user = null; }
  next();
};
exports.requireAuth = (req, res, next) => (req.user ? next() : res.redirect('/login?err=' + encodeURIComponent('Silakan login terlebih dahulu')));
