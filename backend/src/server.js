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
app.post('/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    try {
        const userCheck = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        console.log("✅ Yeni kullanıcı oluşturuldu:", newUser.rows[0]);

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
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Şifre hatalı' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            'secret-key', 
            { expiresIn: '7d' }
        );

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