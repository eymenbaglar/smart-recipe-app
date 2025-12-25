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
        console.log("✅ Connected to the database.");

        // Sorguyu atıyoruz
        const res = await client.query('SELECT * FROM users');

        console.log("\n--- DATA IN THE USERS TABLE ---");
        if (res.rows.length === 0) {
            console.log("The table is currently empty. (No users)");
        } else {
            console.table(res.rows); // Verileri tablo formatında güzel gösterir
        }
        console.log("----------------------------------\n");

    } catch (err) {
        console.error("❌ An error occurred:", err.message);
    } finally {
        // İş bitince bağlantıyı kapatıyoruz ki terminal takılı kalmasın
        await client.end();
        console.log("The connection has been closed.");
    }
}

kullanicilariGoster();