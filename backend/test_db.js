const { Client } = require('pg');

// Bilgileri elle giriyoruz (Debug Modu)
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'smart_recipe_db ', 
  password: 'eymen5856', 
  port: 5432,
});

async function connectTest() {
  try {
    console.log("Bağlanmaya çalışılıyor...");
    await client.connect();
    console.log('✅ BAŞARILI! Sorun .env dosyasındaymış.');
    
    const res = await client.query('SELECT NOW()');
    console.log('🕒 Sunucu Saati:', res.rows[0].now);
    
    await client.end();
  } catch (error) {
    console.error('❌ HALA HATA VAR:', error.message);
    // Hatanın kodunu da görelim
    console.error('Hata Kodu:', error.code); 
  }
}

connectTest();