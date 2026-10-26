const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { q } = require("../lib/db");
const { sign, clear } = require("../lib/auth");
const { periods, SHORT, KAS, enc } = require("../lib/util");

router.get("/", async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const [[tin], [tout], inM, outM, students, paidRows] = await Promise.all([
    q("select coalesce(sum(amount),0)::int t from incomes"),
    q("select coalesce(sum(amount),0)::int t from outcomes"),
    q(
      "select period_month::int m, sum(amount)::int s from incomes where period_year=$1 group by 1",
      [year],
    ),
    q(
      "select extract(month from spent_date)::int m, sum(amount)::int s from outcomes where extract(year from spent_date)=$1 group by 1",
      [year],
    ),
    q("select id, nim, name from students order by nim"),
    q("select student_id, period_year y, period_month m, week w from incomes"),
  ]);

  const a = {},
    b = {};
  inM.forEach((r) => (a[r.m] = r.s));
  outM.forEach((r) => (b[r.m] = r.s));

  // Target 100% per bulan = Jumlah Mahasiswa * 4 minggu * KAS per minggu
  const targetPerMonth = (students.length || 0) * 4 * KAS;

  const max = Math.max(1, ...Object.values(a), ...Object.values(b));
  const chart = SHORT.map((s, i) => {
    const inn = a[i + 1] || 0;
    const out = b[i + 1] || 0;
    // Hitung persentase (dibulatkan)
    const pct =
      targetPerMonth > 0 ? Math.round((inn / targetPerMonth) * 100) : 0;

    return {
      short: s,
      inn,
      out,
      pct,
      hIn: Math.max(6, Math.round((inn / max) * 110)),
      hOut: out ? Math.max(8, Math.round((out / max) * 70)) : 0,
    };
  });

  const paid = {};
  paidRows.forEach((r) => (paid[`${r.student_id}-${r.y}-${r.m}-${r.w}`] = 1));

  res.render("dashboard", {
    title: "Dashboard",
    active: "/",
    year,
    tin: tin.t,
    tout: tout.t,
    saldo: tin.t - tout.t,
    chart,
    students,
    paid,
    periods,
  });
});

router.get("/login", (req, res) =>
  req.user ? res.redirect("/") : res.render("login", { title: "Login" }),
);

router.post("/login", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const [user] = await q("select * from users where email=$1", [email]);
  if (
    !user ||
    !(await bcrypt.compare(req.body.password || "", user.password_hash))
  )
    return res.redirect("/login?err=" + enc("Email atau password salah"));
  sign(user, res);
  res.redirect("/");
});

router.post("/logout", (req, res) => {
  clear(res);
  res.redirect("/");
});

module.exports = router;
