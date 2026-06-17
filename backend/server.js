const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'elderly-care-secret-key-2024';

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'elderly_care.db');
const db = new sqlite3.Database(dbPath);
db.run(`PRAGMA foreign_keys = ON`);

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未授权' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: '无效的token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: '权限不足' });
  }
  next();
};

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve({ lastID: this.lastID, changes: this.changes });
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name, phone, role } = req.body;
    if (!['family', 'volunteer', 'worker'].includes(role)) {
      return res.status(400).json({ error: '无效的角色' });
    }
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const result = await dbRun(
      `INSERT INTO users (username, password, name, phone, role) VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, name, phone, role]
    );
    res.json({ id: result.lastID, username, name, role });
  } catch (err) {
    res.status(400).json({ error: '用户名已存在或注册失败' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await dbGet(`SELECT * FROM users WHERE username = ?`, [username]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
});

app.get('/api/users/me', authenticate, (req, res) => {
  res.json(req.user);
});

app.get('/api/elderly', authenticate, async (req, res) => {
  try {
    const { self_care_level, is_lonely } = req.query;
    let sql = `SELECT * FROM elderly WHERE 1=1`;
    const params = [];
    if (self_care_level) {
      sql += ` AND self_care_level = ?`;
      params.push(self_care_level);
    }
    if (is_lonely !== undefined) {
      sql += ` AND is_lonely = ?`;
      params.push(is_lonely === '1' ? 1 : 0);
    }
    sql += ` ORDER BY created_at DESC`;
    const elderly = await dbAll(sql, params);
    res.json(elderly);
  } catch (err) {
    res.status(500).json({ error: '获取老人列表失败' });
  }
});

app.post('/api/elderly', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, age, address, health_status, emergency_contact, emergency_phone, self_care_level, is_lonely } = req.body;
    const result = await dbRun(
      `INSERT INTO elderly (name, age, address, health_status, emergency_contact, emergency_phone, self_care_level, is_lonely)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, age, address, health_status, emergency_contact, emergency_phone, self_care_level, is_lonely ? 1 : 0]
    );
    res.json({ id: result.lastID, ...req.body });
  } catch (err) {
    res.status(500).json({ error: '添加老人失败' });
  }
});

app.put('/api/elderly/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, address, health_status, emergency_contact, emergency_phone, self_care_level, is_lonely } = req.body;
    await dbRun(
      `UPDATE elderly SET name=?, age=?, address=?, health_status=?, emergency_contact=?, emergency_phone=?, self_care_level=?, is_lonely=?
       WHERE id=?`,
      [name, age, address, health_status, emergency_contact, emergency_phone, self_care_level, is_lonely ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '更新老人信息失败' });
  }
});

app.delete('/api/elderly/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await dbRun(`DELETE FROM elderly WHERE id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

app.get('/api/elderly/:id', authenticate, async (req, res) => {
  try {
    const elderly = await dbGet(`SELECT * FROM elderly WHERE id=?`, [req.params.id]);
    if (!elderly) return res.status(404).json({ error: '老人不存在' });
    res.json(elderly);
  } catch (err) {
    res.status(500).json({ error: '获取老人信息失败' });
  }
});

app.get('/api/family/bindings', authenticate, requireRole('family'), async (req, res) => {
  try {
    const bindings = await dbAll(
      `SELECT fb.*, e.name as elderly_name, e.age, e.address 
       FROM family_bindings fb 
       JOIN elderly e ON fb.elderly_id = e.id 
       WHERE fb.family_id = ?`,
      [req.user.id]
    );
    res.json(bindings);
  } catch (err) {
    res.status(500).json({ error: '获取绑定列表失败' });
  }
});

app.post('/api/family/bindings', authenticate, requireRole('family'), async (req, res) => {
  try {
    const { elderly_id, relation } = req.body;
    const result = await dbRun(
      `INSERT INTO family_bindings (family_id, elderly_id, relation, status) VALUES (?, ?, ?, 'approved')`,
      [req.user.id, elderly_id, relation]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: '绑定失败，可能已绑定' });
  }
});

app.get('/api/family/elderly/:elderlyId/health-records', authenticate, requireRole('family'), async (req, res) => {
  try {
    const records = await dbAll(
      `SELECT hr.*, u.name as creator_name 
       FROM health_records hr 
       LEFT JOIN users u ON hr.created_by = u.id 
       WHERE hr.elderly_id = ? 
       ORDER BY hr.record_date DESC`,
      [req.params.elderlyId]
    );
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '获取健康档案失败' });
  }
});

app.get('/api/family/elderly/:elderlyId/service-records', authenticate, requireRole('family'), async (req, res) => {
  try {
    const records = await dbAll(
      `SELECT sr.*, so.scheduled_time, st.name as service_type, e.name as elderly_name, u.name as worker_name
       FROM service_records sr
       JOIN service_orders so ON sr.order_id = so.id
       JOIN service_types st ON so.service_type_id = st.id
       JOIN elderly e ON so.elderly_id = e.id
       JOIN users u ON sr.worker_id = u.id
       WHERE so.elderly_id = ?
       ORDER BY sr.created_at DESC`,
      [req.params.elderlyId]
    );
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '获取服务记录失败' });
  }
});

app.get('/api/service-types', authenticate, async (req, res) => {
  try {
    const types = await dbAll(`SELECT * FROM service_types`);
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: '获取服务类型失败' });
  }
});

app.get('/api/service-orders', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT so.*, e.name as elderly_name, e.address, st.name as service_type, 
               u1.name as requester_name, u2.name as worker_name
               FROM service_orders so
               JOIN elderly e ON so.elderly_id = e.id
               JOIN service_types st ON so.service_type_id = st.id
               JOIN users u1 ON so.requester_id = u1.id
               LEFT JOIN users u2 ON so.worker_id = u2.id
               WHERE 1=1`;
    const params = [];
    if (status) {
      sql += ` AND so.status = ?`;
      params.push(status);
    }
    if (req.user.role === 'family') {
      const bindings = await dbAll(`SELECT elderly_id FROM family_bindings WHERE family_id = ? AND status = 'approved'`, [req.user.id]);
      const elderlyIds = bindings.map(b => b.elderly_id);
      if (elderlyIds.length > 0) {
        sql += ` AND so.elderly_id IN (${elderlyIds.map(() => '?').join(',')})`;
        params.push(...elderlyIds);
      } else {
        return res.json([]);
      }
    }
    if (req.user.role === 'worker') {
      sql += ` AND (so.status IN ('pending') OR so.worker_id = ?)`;
      params.push(req.user.id);
    }
    sql += ` ORDER BY so.created_at DESC`;
    const orders = await dbAll(sql, params);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: '获取服务订单失败' });
  }
});

app.post('/api/service-orders', authenticate, requireRole('family', 'admin'), async (req, res) => {
  try {
    const { elderly_id, service_type_id, scheduled_time, notes } = req.body;
    const result = await dbRun(
      `INSERT INTO service_orders (elderly_id, service_type_id, requester_id, scheduled_time, notes, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [elderly_id, service_type_id, req.user.id, scheduled_time, notes]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: '创建订单失败' });
  }
});

app.put('/api/service-orders/:id/accept', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const order = await dbGet(`SELECT * FROM service_orders WHERE id=? AND status='pending'`, [req.params.id]);
    if (!order) return res.status(400).json({ error: '订单不可接单' });
    await dbRun(
      `UPDATE service_orders SET status='accepted', worker_id=?, accepted_at=CURRENT_TIMESTAMP WHERE id=?`,
      [req.user.id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '接单失败' });
  }
});

app.put('/api/service-orders/:id/cancel', authenticate, requireRole('family', 'admin'), async (req, res) => {
  try {
    const order = await dbGet(`SELECT * FROM service_orders WHERE id=? AND status='pending'`, [req.params.id]);
    if (!order) return res.status(400).json({ error: '订单不可取消' });
    if (req.user.role === 'family' && order.requester_id !== req.user.id) {
      return res.status(403).json({ error: '只能取消自己发起的预约' });
    }
    await dbRun(`UPDATE service_orders SET status='cancelled' WHERE id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '取消订单失败' });
  }
});

app.put('/api/service-orders/:id/complete', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const { service_content, duration, elderly_feedback } = req.body;
    const order = await dbGet(`SELECT * FROM service_orders WHERE id=? AND status='accepted' AND worker_id=?`, [req.params.id, req.user.id]);
    if (!order) return res.status(400).json({ error: '订单不可完成' });
    
    await dbRun(`UPDATE service_orders SET status='completed', completed_at=CURRENT_TIMESTAMP WHERE id=?`, [req.params.id]);
    await dbRun(
      `INSERT INTO service_records (order_id, worker_id, service_content, duration, elderly_feedback)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, req.user.id, service_content, duration, elderly_feedback]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '完成服务失败' });
  }
});

app.get('/api/volunteer-demands', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT vd.*, e.name as elderly_name, e.address, u.name as creator_name
               FROM volunteer_demands vd
               JOIN elderly e ON vd.elderly_id = e.id
               JOIN users u ON vd.created_by = u.id
               WHERE 1=1`;
    const params = [];
    if (status) {
      sql += ` AND vd.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY vd.created_at DESC`;
    const demands = await dbAll(sql, params);
    res.json(demands);
  } catch (err) {
    res.status(500).json({ error: '获取需求列表失败' });
  }
});

app.post('/api/volunteer-demands', authenticate, requireRole('family', 'admin'), async (req, res) => {
  try {
    const { elderly_id, title, description, demand_type } = req.body;
    const result = await dbRun(
      `INSERT INTO volunteer_demands (elderly_id, title, description, demand_type, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [elderly_id, title, description, demand_type, req.user.id]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: '发布需求失败' });
  }
});

app.post('/api/volunteer-demands/:id/signup', authenticate, requireRole('volunteer'), async (req, res) => {
  try {
    const result = await dbRun(
      `INSERT INTO volunteer_signups (demand_id, volunteer_id, status) VALUES (?, ?, 'approved')`,
      [req.params.id, req.user.id]
    );
    await dbRun(`UPDATE volunteer_demands SET status='matched' WHERE id=?`, [req.params.id]);
    res.json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: '报名失败，可能已报名' });
  }
});

app.get('/api/volunteer/my-signups', authenticate, requireRole('volunteer'), async (req, res) => {
  try {
    const signups = await dbAll(
      `SELECT vs.*, vd.title, vd.description, vd.demand_type, vd.status as demand_status,
       e.name as elderly_name, e.address
       FROM volunteer_signups vs
       JOIN volunteer_demands vd ON vs.demand_id = vd.id
       JOIN elderly e ON vd.elderly_id = e.id
       WHERE vs.volunteer_id = ?
       ORDER BY vs.created_at DESC`,
      [req.user.id]
    );
    res.json(signups);
  } catch (err) {
    res.status(500).json({ error: '获取报名记录失败' });
  }
});

app.get('/api/admin/stats', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const totalElderly = await dbGet(`SELECT COUNT(*) as count FROM elderly`);
    const totalOrders = await dbGet(`SELECT COUNT(*) as count FROM service_orders`);
    const completedOrders = await dbGet(`SELECT COUNT(*) as count FROM service_orders WHERE status='completed'`);
    const totalVolunteers = await dbGet(`SELECT COUNT(*) as count FROM users WHERE role='volunteer'`);
    const totalWorkers = await dbGet(`SELECT COUNT(*) as count FROM users WHERE role='worker'`);
    const lonelyElderly = await dbGet(`SELECT COUNT(*) as count FROM elderly WHERE is_lonely=1`);
    
    const serviceTypeStats = await dbAll(`
      SELECT st.name, st.category, COUNT(so.id) as count
      FROM service_types st
      LEFT JOIN service_orders so ON st.id = so.service_type_id
      GROUP BY st.id
      ORDER BY count DESC
    `);

    const selfCareStats = await dbAll(`
      SELECT self_care_level, COUNT(*) as count
      FROM elderly
      GROUP BY self_care_level
    `);

    const monthlyStats = await dbAll(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as total,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
      FROM service_orders
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `);

    const volunteerActivity = await dbAll(`
      SELECT u.id, u.name, u.phone, COUNT(vs.id) as signup_count
      FROM users u
      LEFT JOIN volunteer_signups vs ON u.id = vs.volunteer_id
      WHERE u.role = 'volunteer'
      GROUP BY u.id
      ORDER BY signup_count DESC
    `);

    res.json({
      totalElderly: totalElderly.count,
      totalOrders: totalOrders.count,
      completedOrders: completedOrders.count,
      completionRate: totalOrders.count > 0 ? Math.round(completedOrders.count / totalOrders.count * 100) : 0,
      totalVolunteers: totalVolunteers.count,
      totalWorkers: totalWorkers.count,
      lonelyElderly: lonelyElderly.count,
      serviceTypeStats,
      selfCareStats,
      monthlyStats: monthlyStats.reverse(),
      volunteerActivity
    });
  } catch (err) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
