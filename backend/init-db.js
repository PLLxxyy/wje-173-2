const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'elderly_care.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'family', 'worker', 'volunteer')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS elderly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    address TEXT NOT NULL,
    health_status TEXT,
    emergency_contact TEXT NOT NULL,
    emergency_phone TEXT NOT NULL,
    self_care_level TEXT NOT NULL CHECK(self_care_level IN ('independent', 'semi-dependent', 'dependent')),
    is_lonely INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS family_bindings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL,
    elderly_id INTEGER NOT NULL,
    relation TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (elderly_id) REFERENCES elderly(id) ON DELETE CASCADE,
    UNIQUE(family_id, elderly_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS service_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK(category IN ('home', 'errand', 'medical', 'rehab', 'companion'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS service_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    elderly_id INTEGER NOT NULL,
    service_type_id INTEGER NOT NULL,
    requester_id INTEGER NOT NULL,
    scheduled_time DATETIME NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'completed', 'cancelled')),
    worker_id INTEGER,
    accepted_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES elderly(id) ON DELETE CASCADE,
    FOREIGN KEY (service_type_id) REFERENCES service_types(id),
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (worker_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS service_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    service_content TEXT NOT NULL,
    duration INTEGER,
    elderly_feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    elderly_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    blood_pressure TEXT,
    heart_rate INTEGER,
    blood_sugar TEXT,
    medications TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES elderly(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS volunteer_demands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    elderly_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    demand_type TEXT NOT NULL CHECK(demand_type IN ('companion', 'errand')),
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'matched', 'completed')),
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES elderly(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS volunteer_signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    demand_id INTEGER NOT NULL,
    volunteer_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (demand_id) REFERENCES volunteer_demands(id) ON DELETE CASCADE,
    FOREIGN KEY (volunteer_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(demand_id, volunteer_id)
  )`);

  const insertServiceTypes = db.prepare(`INSERT OR IGNORE INTO service_types (name, description, category) VALUES (?, ?, ?)`);
  const serviceTypes = [
    ['家政保洁', '上门打扫卫生、整理家务', 'home'],
    ['代买代办', '代购物品、代办事务', 'errand'],
    ['陪诊就医', '陪同去医院看病取药', 'medical'],
    ['康复护理', '康复训练、日常护理', 'rehab'],
    ['陪伴聊天', '陪伴聊天解闷', 'companion'],
    ['代办事务', '帮忙办理各类事务', 'errand']
  ];
  serviceTypes.forEach(([name, desc, cat]) => insertServiceTypes.run(name, desc, cat));
  insertServiceTypes.finalize();

  const salt = bcrypt.genSaltSync(10);
  const insertUser = db.prepare(`INSERT OR IGNORE INTO users (username, password, name, phone, role) VALUES (?, ?, ?, ?, ?)`);
  
  insertUser.run('admin', bcrypt.hashSync('admin123', salt), '系统管理员', '13800138000', 'admin');
  insertUser.run('worker1', bcrypt.hashSync('123456', salt), '张服务', '13800138001', 'worker');
  insertUser.run('worker2', bcrypt.hashSync('123456', salt), '李服务', '13800138002', 'worker');
  insertUser.run('volunteer1', bcrypt.hashSync('123456', salt), '王志愿', '13800138003', 'volunteer');
  insertUser.run('family1', bcrypt.hashSync('123456', salt), '赵家属', '13800138004', 'family');
  insertUser.finalize();

  const insertElderly = db.prepare(`INSERT OR IGNORE INTO elderly (name, age, address, health_status, emergency_contact, emergency_phone, self_care_level, is_lonely) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const elderlyData = [
    ['张爷爷', 78, '阳光社区1号楼101室', '高血压、糖尿病', '张小明', '13900139001', 'semi-dependent', 1],
    ['李奶奶', 82, '阳光社区2号楼202室', '心脏病', '李小华', '13900139002', 'dependent', 1],
    ['王大爷', 72, '阳光社区3号楼303室', '关节炎', '王大军', '13900139003', 'independent', 0],
    ['刘奶奶', 75, '阳光社区1号楼404室', '轻度认知障碍', '刘小红', '13900139004', 'semi-dependent', 1],
    ['陈爷爷', 85, '阳光社区2号楼505室', '高血压', '陈小军', '13900139005', 'dependent', 0]
  ];
  elderlyData.forEach(([name, age, addr, health, contact, phone, level, lonely]) => 
    insertElderly.run(name, age, addr, health, contact, phone, level, lonely));
  insertElderly.finalize();

  const insertBinding = db.prepare(`INSERT OR IGNORE INTO family_bindings (family_id, elderly_id, relation, status) VALUES (?, ?, ?, ?)`);
  insertBinding.run(5, 1, '孙子', 'approved');
  insertBinding.finalize();

  console.log('数据库初始化完成！');
  console.log('默认账号：');
  console.log('  管理员：admin / admin123');
  console.log('  服务人员：worker1 / 123456');
  console.log('  志愿者：volunteer1 / 123456');
  console.log('  家属：family1 / 123456');
});

db.close();
