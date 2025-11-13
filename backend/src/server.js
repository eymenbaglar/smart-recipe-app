// backend/src/server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./config/database');

const app = express();
app.use(cors());
app.use(express.json());

// Basit in-memory database (test için)
let users = [];
let recipes = [
  {
    id: 1,
    title: "Domates Çorbası",
    description: "Lezzetli ve sıcak domates çorbası",
    prepTime: 30,
    calories: 150,
    image: "https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Domates+Corbasi",
    ingredients: ["Domates", "Soğan", "Sarımsak", "Tuz", "Karabiber"]
  },
  {
    id: 2,
    title: "Tavuklu Salata",
    description: "Sağlıklı ve doyurucu tavuklu salata",
    prepTime: 20,
    calories: 250,
    image: "https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=Tavuklu+Salata",
    ingredients: ["Tavuk", "Marul", "Domates", "Salatalık", "Zeytinyağı"]
  }
];

// Register endpoint
// Gerekli paketlerin sayfanın en üstünde olduğundan emin ol:
// const db = require('./database/db');
// const bcrypt = require('bcrypt');

app.post('/auth/register', async (req, res) => {
    // 1. Frontend'den gelen verileri al
    const { username, email, password } = req.body;

    // Basit validasyon: Veriler boş mu?
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    try {
        // 2. Kullanıcı zaten var mı kontrol et (Email veya Username)
        const userCheck = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' });
        }

        // 3. Şifreyi Hash'le (Şifrele)
        // 10 rakamı "salt rounds"tur, güvenli bir standarttır.
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Yeni kullanıcıyı veritabanına ekle
        // 'RETURNING *' komutu, eklenen veriyi bize geri verir (id vs. almak için)
        const newUser = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        console.log("✅ Yeni kullanıcı oluşturuldu:", newUser.rows[0]);

        // 5. Başarılı cevabı dön
        res.status(201).json({
            message: 'Kullanıcı başarıyla oluşturuldu!',
            user: newUser.rows[0]
        });

    } catch (err) {
        console.error("Register Hatası:", err);
        res.status(500).json({ error: 'Sunucu hatası oluştu.' });
    }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Kullanıcıyı veritabanından çek
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        // Kullanıcı yoksa
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        }

        const user = result.rows[0];

        // 2. Şifreyi Karşılaştır
        // DİKKAT: Veritabanındaki sütun adı 'password_hash'
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Şifre hatalı' });
        }

        // 3. Token Oluştur
        // const jwt = require('jsonwebtoken'); // Dosyanın tepesinde tanımlı değilse hata verir!
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            'secret-key', // Güvenlik için .env'den almalısın ama şimdilik böyle kalsın
            { expiresIn: '7d' }
        );

        // 4. Başarılı Cevabı Dön
        res.json({
            message: 'Giriş Başarılı',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error("Login Hatası:", err); // Hatayı terminale yazdırır
        res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
});

// Get recipes
app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});