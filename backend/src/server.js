// backend/src/server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
  
  // Basit kontrol
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: users.length + 1,
    username,
    email,
    password: hashedPassword
  };
  
  users.push(user);
  
  const token = jwt.sign({ userId: user.id }, 'secret-key', { expiresIn: '7d' });
  
  res.json({
    token,
    user: { id: user.id, username, email }
  });
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ userId: user.id }, 'secret-key', { expiresIn: '7d' });
  
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email }
  });
});

// Get recipes
app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});