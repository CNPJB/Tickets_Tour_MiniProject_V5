// routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');

// multer storage -> save to public/assets/img
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/assets/img'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

// Middleware ตรวจสอบสิทธิ์ admin
function requireRole(...roles) {
  return(req, res, next) => {
    if (!req.session || !req.session.user || !roles.includes(req.session.user.role)) {
    // return res.status(403).json({ message: 'Forbidden' });
    return res.redirect('/');  // กลับหน้าแรก
    }
  next();
};
};


// Main route to serve the HTML file
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public"));
});

// Register API
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email and password are required.' });
  }
  try {
    // Check if username or email already exists
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userCheck.rows.length > 0) {
      // ตรวจสอบว่า username หรือ email ซ้ำ
      const isUsernameTaken = userCheck.rows.some(u => u.username === username);
      const isEmailTaken = userCheck.rows.some(u => u.email === email);
      let msg = '';
      if (isUsernameTaken) msg += 'Username already exists. ';
      if (isEmailTaken) msg += 'Email already exists.';
      return res.status(409).json({ message: msg.trim() });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insert new user
    await pool.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)', [username, email, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Login API
router.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: 'Username/email and password are required.' });
  }
  try {
    // ค้นหาผู้ใช้จาก username หรือ email
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [usernameOrEmail]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User not found.' });
    }
    const user = userResult.rows[0];
    // ตรวจสอบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Username/Email or Password.' });
    }
    // ส่งข้อมูล user (ไม่รวม password)
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role_id
    };
    res.json({ message: 'Login successful.' });
  } catch (err) {
    console.error("Error at: ", err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// me API to get current user info
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  res.json({ user: req.session.user });
});

// Logout API
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful.' });
  });
});

//////////////////////////////////////
// API get tour_prices page
// router.get('/tour_price', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT tour_id, price_std, price_vip FROM tours');
//     console.log('DB rows:', result.rows);

//     const tourPrices = {};
//     result.rows.forEach(row => {
//       tourPrices[row.tour_id] = {
//         standard: row.price_std,
//         vip: row.price_vip
//       };
//     });

//     res.json(tourPrices);
//   } catch (err) {
//     console.error("DB ERROR:", err);
//     res.status(500).json({ error: 'Database error' });
//   }
// });

// จองตั๋ว
router.post('/tickets', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { tour_id, ticket_type } = req.body;
    const user_id = req.session.user.id;

    const expiryDateResult = await pool.query(`
        SELECT tour_date AS expiry_date
        FROM tours t
        WHERE t.tour_id = $1
      `, [tour_id]);
    // ตรวจสอบว่ามีข้อมูลทัวร์หรือไม่
    if (expiryDateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tour not found' });
    }

    const expiryDate = expiryDateResult.rows[0].expiry_date;

    await pool.query(
      `INSERT INTO tickets
        (user_id, tour_id, ticket_type, ticket_status, expiry_date)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [user_id, tour_id, ticket_type, expiryDate]
    );

    res.json({ message: 'Ticket booked successfully!' });
  } catch (err) {
    console.error("Ticket booking error:", err);
    res.status(500).json({ message: 'Database error' });
  }
});

// ดึงตั๋วของ user หน้า my_tickets.html
router.get('/my_tickets', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user_id = req.session.user.id;
    const result = await pool.query(`
      SELECT tk.ticket_id, tr.tour_name, tr.tour_date,tr.tour_time, tr.tour_location, 
      tk.ticket_type, tk.ticket_status, tk.purchase_date, tk.expiry_date
      FROM tickets tk
      JOIN tours tr ON tk.tour_id = tr.tour_id
      WHERE tk.user_id = $1
      ORDER BY 
      CASE tk.ticket_status
        WHEN 'confirmed' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'canceled' THEN 3
        WHEN 'used' THEN 4
        WHEN 'expired' THEN 5
      END,
      tk.ticket_id DESC
    `, [user_id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch tickets error:", err);
    res.status(500).json({ message: 'Database error' });
  }
});
//////////////////////////////////////

// GET /api/tours - แสดงตามประเภท
router.get('/api/tours', async (req, res) => {
  try {
    // รับค่า 'type' จาก URL (เช่น 'La Liga')
    const { type } = req.query;

    // ดึงเฉพาะทัวร์ที่มีสถานะ 'scheduled'
    let sql = "SELECT * FROM tours WHERE tour_status = 'scheduled'";
    const params = [];

    // **เงื่อนไขสำคัญ:** ถ้ามีการส่ง type มาด้วย
    if (type) {
      // ให้เพิ่มเงื่อนไขการกรอง tour_type เข้าไปใน SQL
      sql += " AND tour_type = $1";
      params.push(type);
    }

    sql += " ORDER BY tour_date ASC";

    const result = await pool.query(sql, params);
    res.json(result.rows); // ส่งข้อมูลที่กรองแล้วกลับไป

  } catch (err) {
    console.error('Error fetching tours:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin - API get admin page
router.get('/admin', requireRole(1), (req, res) => {
  res.sendFile(path.join(__dirname, "../protected/admin_users.html"));
});
// Admin - API get admin tickets page
router.get('/admin-tickets', requireRole(1, 3), (req, res) => {
  res.sendFile(path.join(__dirname, "../protected/admin_tickets.html"));
});
// Admin - API get admin tour page
router.get('/admin-tours', requireRole(1), (req, res) => {
  res.sendFile(path.join(__dirname, "../protected/admin_tours.html"));
});

///////////////////////////////////////
// Admin - API สำหรับดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับหน้า admin_users.html)
router.get('/getusers', requireRole(1), async (req, res) => {
  try {
    const result = await pool.query('SELECT users.id as id, username, email, roles.role_name as role_name from users  inner join roles on users.role_id = roles.id;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Admin - API สำหรับแก้ไขข้อมูลผู้ใช้ (สำหรับหน้า admin_users.html)
router.put("/updateuser/:id", requireRole(1), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role_id } = req.body;

    if (!username || !email || !role_id) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const result = await pool.query(
      "UPDATE users SET username = $1, email = $2, role_id = $3 WHERE id = $4 RETURNING *",
      [username, email, role_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin - API สำหรับลบผู้ใช้ (สำหรับหน้า admin_users.html)
router.delete("/deleteuser/:id", requireRole(1), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

//////////////////////////////////////

// Admin - API: ดึงข้อมูลทัวร์ทั้งหมด (สำหรับใส่ใน Dropdown ของหน้า Admin)
router.get('/api/all-tours', requireRole(1), async (req, res) => {
  try {
    // ดึงเฉพาะ ID และชื่อ เพื่อประสิทธิภาพ
    const sql = "SELECT tour_id, tour_name FROM tours ORDER BY tour_name ASC";
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all tours for admin:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin - API: ดึงข้อมูลทัวร์ 1 รายการตาม ID (เพื่อนำไปใส่ในฟอร์มแก้ไข)
router.get('/api/tours/:id', requireRole(1), async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "SELECT * FROM tours WHERE tour_id = $1";
    const result = await pool.query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tour not found' });
    }
    res.json(result.rows[0]); // ส่งข้อมูลทัวร์ที่เจอ (ตัวแรก) กลับไป
  } catch (err) {
    console.error(`Error fetching tour with id ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin - PUT API: อัปเดตข้อมูลทัวร์ (Update) - รองรับ multipart (รูปภาพ)
router.put('/api/tours/:id', requireRole(1), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image_2', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;

    // อ่านฟิลด์จาก body (ถ้ามาจาก FormData จะอยู่ใน req.body)
    const {
      tour_name, tour_date, tour_time, tour_type,
      tour_description, tour_location, price_std, price_vip,
      capacity, tour_status
    } = req.body;

    // หา existing tour เพื่อเก็บค่า image เดิม (ถ้าไม่มีการอัปโหลดไฟล์ใหม่)
    const existing = await pool.query('SELECT * FROM tours WHERE tour_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Tour not found' });
    }
    const existingTour = existing.rows[0];

    // กำหนด image path จากไฟล์ที่อัปโหลด (ถ้ามี) หรือใช้ค่าจาก DB เดิม
    let image_path = existingTour.image_path;
    let image_path_2 = existingTour.image_path_2;
    if (req.files) {
      if (req.files['image'] && req.files['image'][0]) {
        image_path = '/assets/img/' + req.files['image'][0].filename;
      }
      if (req.files['image_2'] && req.files['image_2'][0]) {
        image_path_2 = '/assets/img/' + req.files['image_2'][0].filename;
      }
    }

    const sql = `
            UPDATE tours 
            SET 
                tour_name = $1, tour_date = $2, tour_time = $3, tour_type = $4,
                tour_description = $5, tour_location = $6, price_std = $7,
                price_vip = $8, capacity = $9, image_path = $10, image_path_2 = $11,
                tour_status = $12
            WHERE tour_id = $13
            RETURNING *
        `;

    const values = [
      tour_name || existingTour.tour_name,
      tour_date || existingTour.tour_date,
      tour_time || existingTour.tour_time,
      tour_type || existingTour.tour_type,
      tour_description || existingTour.tour_description,
      tour_location || existingTour.tour_location,
      price_std || existingTour.price_std,
      price_vip || existingTour.price_vip,
      capacity || existingTour.capacity,
      image_path,
      image_path_2,
      tour_status || existingTour.tour_status,
      id
    ];

    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tour not found' });
    }

    res.json({ message: 'Tour updated successfully!', tour: result.rows[0] });
  } catch (err) {
    console.error(`Error updating tour with id ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

////////////////////////////////////////////////////////////////

// Admin - post /api/Insert_tours (รองรับ multipart/form-data เพื่ออัปโหลดรูป)
router.post('/api/Insert_tours', requireRole(1), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image_2', maxCount: 1 }]), async (req, res) => {
  try {
    // อ่านค่าจาก FormData (req.body เป็น text ทั้งหมดยกเว้นไฟล์ที่อยู่ใน req.files)
    const {
      tour_name, tour_date, tour_time, tour_type,
      tour_description, tour_location, price_std, price_vip, capacity
    } = req.body;

    let image_path = null;
    let image_path_2 = null;
    if (req.files) {
      if (req.files['image'] && req.files['image'][0]) {
        image_path = '/assets/img/' + req.files['image'][0].filename;
      }
      if (req.files['image_2'] && req.files['image_2'][0]) {
        image_path_2 = '/assets/img/' + req.files['image_2'][0].filename;
      }
    }

    const result = await pool.query(
      `INSERT INTO tours 
      (tour_name, tour_date, tour_time, tour_type, tour_description, tour_location, price_std, price_vip, capacity, image_path, image_path_2)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tour_name, tour_date, tour_time, tour_type, tour_description, tour_location, price_std, price_vip, capacity, image_path, image_path_2]
    );

    res.json({ tour: result.rows[0] });
  } catch (err) {
    console.error('Insert tours error:', err);
    res.status(500).json({ message: 'Database insert failed' });
  }
});

// Admin - get all tour API
router.get('/api/get-all-tours-data', requireRole(1), async (req, res) => {
  try {
    const sql = "SELECT * FROM tours ORDER BY tour_id ASC";
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all tour data for table:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//////////////////////////////////////////////////////////////////
// Admin - get Ticket API
router.get('/gettickets', requireRole(1, 3), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.ticket_id, t.user_id,u.username, tr.tour_name, t.ticket_type, 
             t.ticket_status, t.purchase_date, t.expiry_date
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      JOIN tours tr ON t.tour_id = tr.tour_id
      ORDER BY 
      CASE t.ticket_status
        WHEN 'pending' THEN 1
        WHEN 'confirmed' THEN 2
        WHEN 'canceled' THEN 3
      ELSE 4
      END,
      t.ticket_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tickets:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin - Update ticket status
router.put('/updateticket/:id', requireRole(1, 3), async (req, res) => {
  const client = await pool.connect(); // ใช้ client สำหรับ transaction
  try {
    const { id } = req.params;
    const { ticket_status } = req.body;

    if (!ticket_status) {
      return res.status(400).json({ message: 'Missing ticket status' });
    }

    await client.query('BEGIN'); // เริ่ม transaction
    const result = await pool.query(
      `UPDATE tickets 
       SET ticket_status = $1
       WHERE ticket_id = $2
       RETURNING *`,
      [ticket_status, id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    // ถ้าสถานะเป็น confirmed > update purchase_date, ลด capacity ของ tour
    if (ticket_status === 'confirmed') {
      await client.query(
        `UPDATE tickets
         SET purchase_date = NOW()
         WHERE ticket_id = $1`,
        [id]
      );

      await client.query(
        `UPDATE tours 
         SET capacity = capacity - 1
         WHERE tour_id = $1 AND capacity > 0`,
        [ticket.tour_id]
      );
    }

    await client.query('COMMIT'); // บันทึกการเปลี่ยนแปลง

    res.json({ message: 'Ticket updated successfully', ticket: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK'); // ย้อนกลับถ้า error
    console.error("Error updating ticket:", err);
    res.status(500).json({ message: 'Server error' });
  }
});
//////////////////////////////////////////////////////////////////

// ล่างสุด ห้ามลบ
module.exports = router;

