// 1. .env dosyasını okuyup şifreleri alıyoruz
require('dotenv').config();

// 2. PostgreSQL kütüphanesini çağırıyoruz
const { Client } = require('pg');

// 3. Bağlantı ayarlarını yapıyoruz (.env'den otomatik okur)
const client = new Client({
    connectionString: process.env.DATABASE_URL, 
});

async function kullanicilariGoster() {
    try {
        // Kapıyı çalıyoruz (Bağlan)
        await client.connect();
        console.log("✅ Veritabanına bağlanıldı.");

        // Sorguyu atıyoruz
        const res = await client.query('SELECT * FROM users');

        console.log("\n--- USERS TABLOSUNDAKİ VERİLER ---");
        if (res.rows.length === 0) {
            console.log("Tablo şu an boş. (Hiç kullanıcı yok)");
        } else {
            console.table(res.rows); // Verileri tablo formatında güzel gösterir
        }
        console.log("----------------------------------\n");

    } catch (err) {
        console.error("❌ Hata oluştu:", err.message);
    } finally {
        // İş bitince bağlantıyı kapatıyoruz ki terminal takılı kalmasın
        await client.end();
        console.log("Bağlantı kapatıldı.");
    }
}

kullanicilariGoster();