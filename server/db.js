const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'quote.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- 建表 ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('buyer','supplier')),
  company TEXT,
  contact TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','awarded')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inquiry_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  spec TEXT,
  unit TEXT,
  quantity REAL NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES users(id),
  delivery_days INTEGER,
  remark TEXT,
  total_price REAL NOT NULL DEFAULT 0,
  awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(inquiry_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  inquiry_item_id INTEGER NOT NULL REFERENCES inquiry_items(id),
  unit_price REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_inquiry_items_inquiry ON inquiry_items(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_quotations_inquiry ON quotations(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_quotations_supplier ON quotations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_q ON quotation_items(quotation_id);
`);

// ---------- 种子数据 ----------
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const insUser = db.prepare(
    'INSERT INTO users (username, password_hash, role, company, contact) VALUES (?,?,?,?,?)'
  );
  const hash = (p) => bcrypt.hashSync(p, 10);

  const buyer = insUser.run('buyer', hash('buyer123'), 'buyer', '示例采购有限公司', '王经理 13800000000').lastInsertRowid;
  const s1 = insUser.run('supplier1', hash('sup123'), 'supplier', '长城物资供应公司', '李总 13900000001').lastInsertRowid;
  const s2 = insUser.run('supplier2', hash('sup123'), 'supplier', '远大商贸有限公司', '赵总 13900000002').lastInsertRowid;
  const s3 = insUser.run('supplier3', hash('sup123'), 'supplier', '鼎盛工业器材', '孙总 13900000003').lastInsertRowid;

  // 示例询价单
  const insInq = db.prepare(
    'INSERT INTO inquiries (buyer_id, title, description, deadline, status) VALUES (?,?,?,?,?)'
  );
  const deadline = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const inqId = insInq.run(buyer, '办公电脑采购询价', '需采购一批台式办公电脑及显示器，请按明细报价，含运费。', deadline, 'open').lastInsertRowid;

  const insItem = db.prepare(
    'INSERT INTO inquiry_items (inquiry_id, name, spec, unit, quantity) VALUES (?,?,?,?,?)'
  );
  const i1 = insItem.run(inqId, '台式电脑', 'i5/16G/512G', '台', 20).lastInsertRowid;
  const i2 = insItem.run(inqId, '显示器', '24寸 1080P', '台', 20).lastInsertRowid;
  const i3 = insItem.run(inqId, '键鼠套装', '无线', '套', 20).lastInsertRowid;

  // 示例报价
  const insQ = db.prepare(
    'INSERT INTO quotations (inquiry_id, supplier_id, delivery_days, remark, total_price) VALUES (?,?,?,?,?)'
  );
  const insQI = db.prepare(
    'INSERT INTO quotation_items (quotation_id, inquiry_item_id, unit_price) VALUES (?,?,?)'
  );

  const quotes = [
    { sid: s1, days: 5, remark: '现货，含运费', prices: [3800, 800, 120] },
    { sid: s2, days: 7, remark: '可开发票', prices: [3650, 850, 110] },
    { sid: s3, days: 10, remark: '量大从优', prices: [3720, 780, 130] },
  ];
  for (const q of quotes) {
    const qid = insQ.run(inqId, q.sid, q.days, q.remark, 0).lastInsertRowid;
    let total = 0;
    const itemIds = [i1, i2, i3];
    const qtys = [20, 20, 20];
    for (let k = 0; k < 3; k++) {
      insQI.run(qid, itemIds[k], q.prices[k]);
      total += q.prices[k] * qtys[k];
    }
    db.prepare('UPDATE quotations SET total_price=? WHERE id=?').run(total, qid);
  }

  console.log('[seed] 已初始化演示数据');
}

seed();

module.exports = db;
