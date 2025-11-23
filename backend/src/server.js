// backend/src/server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./config/database');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

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
            process.env.JWT_SECRET, 
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

//kullanıcı bilgilerini değiştirme
app.patch('/api/profile', auth, async (req, res) => {
  //req'den gelen kullanıcı
  const userId = req.user.id;
  const { username, email } = req.body;

  try {
    //email kontrol kısmı
    const emailCheck = await db.query('SELECT * FROM users WHERE email = $1 AND id != $2', [email, userId]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This email is already used.' });
    }

    //güncelle
    const result = await db.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING id, username, email',
      [username, email, userId]
    );

    const updatedUser = result.rows[0];
    res.json({ message: 'Profile updated succesfully.', user: updatedUser });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/profile/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user; //authdan kullanıcıyı al

  try {
    //mevcut şifrenin doğruluğunu kontrol et
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Your current password is incorrect.' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    //veritabanını güncelle
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHashedPassword, user.id]
    );

    res.json({ message: 'Your password has been successfully updated.' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//kullanıcının MyStock add kısmında ekleme yaparken istediği ingredient'ı bulması
app.get('/api/ingredients/search', auth, async (req, res) => {
  const { query } = req.query; // query'i al

  //min 2 harf giriyor
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Please enter at least 2 letters.' });
  }

  try {
    // databasede ara
    const result = await db.query(
      'SELECT id, name, unit, unit_category, calories_per_unit FROM ingredients WHERE name ILIKE $1 LIMIT 10',
      [`%${query}%`]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//MyStock'a ürün ekleme
app.post('/api/refrigerator/add', auth, async (req, res) => {
  const userId = req.user.id;
  const { ingredientId, quantity } = req.body; 

  try {
    let fridgeResult = await db.query('SELECT id FROM virtual_refrigerator WHERE user_id = $1', [userId]);
    let fridgeId;

    if (fridgeResult.rows.length === 0) {
      const newFridge = await db.query(
        'INSERT INTO virtual_refrigerator (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
      fridgeId = newFridge.rows[0].id;
    } else {
      fridgeId = fridgeResult.rows[0].id;
    }

    //dolapta aynı malzemeden var mı
    const checkItem = await db.query(
      'SELECT id, quantity FROM refrigerator_items WHERE virtual_refrigerator_id = $1 AND ingredient_id = $2',
      [fridgeId, ingredientId]
    );

    if (checkItem.rows.length > 0) {
      await db.query(
        'UPDATE refrigerator_items SET quantity = quantity + $1, added_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, checkItem.rows[0].id]
      );
      res.status(200).json({ message: 'Ingredient amount updated.' });

    } else {
      await db.query(
        'INSERT INTO refrigerator_items (virtual_refrigerator_id, ingredient_id, quantity) VALUES ($1, $2, $3)',
        [fridgeId, ingredientId, quantity]
      );
      res.status(201).json({ message: 'New Ingredient added.' });
    }

  } catch (error) {
    console.error('Stock add error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

//MyStock listesini çekme
app.get('/api/refrigerator', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    //kullancının mystock kısmını çek
    const result = await db.query(
      `SELECT 
        ri.id, 
        i.name, 
        ri.quantity, 
        i.unit,           
        i.unit_category, 
        ri.added_at 
       FROM refrigerator_items ri
       JOIN virtual_refrigerator vr ON ri.virtual_refrigerator_id = vr.id
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE vr.user_id = $1
       ORDER BY ri.added_at DESC`, 
      [userId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('MyStock listing error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//ürün silme
app.delete('/api/refrigerator/delete/:itemId', auth, async (req, res) => {
  const { itemId } = req.params;

  try {
    await db.query('DELETE FROM refrigerator_items WHERE id = $1', [itemId]);
    
    res.json({ message: 'Ingredient deleted succesfully!' });

  } catch (error) {
    console.error('Deletion Error', error);
    res.status(500).json({ error: 'Server Error' });
  }
});

//ürünü güncelleme
app.patch('/api/refrigerator/update/:itemId', auth, async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body; 

  try {
    await db.query(
      'UPDATE refrigerator_items SET quantity = $1 WHERE id = $2',
      [quantity, itemId]
    );
    
    res.json({ message: 'Ingredient Updated' });

  } catch (error) {
    console.error('Editing Error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});