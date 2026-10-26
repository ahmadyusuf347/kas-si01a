const { Pool, types } = require('pg');
types.setTypeParser(1082, v => v); // DATE tetap string 'YYYY-MM-DD'
const url = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: url,
  ssl: url && !/localhost|127\.0\.0\.1/.test(url) ? { rejectUnauthorized: false } : false,
  max: process.env.VERCEL ? 1 : 10,
});
module.exports = { pool, q: (text, params) => pool.query(text, params).then(r => r.rows) };
