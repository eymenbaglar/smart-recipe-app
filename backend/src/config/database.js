const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

console.log("DB Bağlantı URL:", process.env.DATABASE_URL ? "✅ Okundu" : "❌ BULUNAMADI");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
});

module.exports = pool;