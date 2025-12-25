const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

console.log("DB Connection URL:", process.env.DATABASE_URL ? "✅ Read" : "❌ NOT FOUND");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
});

module.exports = pool;