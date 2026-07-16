// CloudBase 云数据库适配层
// 用腾讯云 CloudBase 云数据库（@cloudbase/node-sdk）替代本地 SQLite，
// 解决云函数临时磁盘不持久 + better-sqlite3 原生模块不可用的问题。
// 路由层只依赖本文件导出的函数，不直接写 SQL。

const cloudbase = require('@cloudbase/node-sdk');

// 凭据通过环境变量注入（在 CloudBase 云函数环境中自动注入，本地可用 .env 覆盖）
const app = cloudbase.init({
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY,
  env: process.env.TCB_ENV, // 云环境 ID，例如 quote-system-1a2b3c
});

const db = app.database();

// ---------- 工具：云数据库返回的是 { data: [...] }，这里统一展开 ----------
async function list(collection, query = {}) {
  const res = await db.collection(collection).where(query).get();
  return res.data || [];
}
async function first(collection, query) {
  const rows = await list(collection, query);
  return rows[0];
}
async function insert(collection, doc) {
  const res = await db.collection(collection).add(doc);
  return res.id; // 云数据库返回 _id
}
async function update(collection, query, data) {
  return db.collection(collection).where(query).update(data);
}
async function remove(collection, query) {
  return db.collection(collection).where(query).remove();
}
async function count(collection, query = {}) {
  const res = await db.collection(collection).where(query).count();
  return res.total;
}

// ---------- 初始化集合 + 种子数据 ----------
async function seed() {
  const users = await list('users');
  if (users.length > 0) return;

  const hash = (p) => require('bcryptjs').hashSync(p, 10);

  const buyerId = await insert('users', {
    username: 'buyer', password_hash: hash('buyer123'), role: 'buyer',
    company: '示例采购有限公司', contact: '王经理 13800000000',
    created_at: new Date().toISOString(),
  });
  const s1 = await insert('users', {
    username: 'supplier1', password_hash: hash('sup123'), role: 'supplier',
    company: '长城物资供应公司', contact: '李总 13900000001', created_at: new Date().toISOString(),
  });
  const s2 = await insert('users', {
    username: 'supplier2', password_hash: hash('sup123'), role: 'supplier',
    company: '远大商贸有限公司', contact: '赵总 13900000002', created_at: new Date().toISOString(),
  });
  const s3 = await insert('users', {
    username: 'supplier3', password_hash: hash('sup123'), role: 'supplier',
    company: '鼎盛工业器材', contact: '孙总 13900000003', created_at: new Date().toISOString(),
  });

  const deadline = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const inqId = await insert('inquiries', {
    buyer_id: buyerId, title: '办公电脑采购询价',
    description: '需采购一批台式办公电脑及显示器，请按明细报价，含运费。',
    deadline, status: 'open', created_at: new Date().toISOString(),
  });

  const i1 = await insert('inquiry_items', { inquiry_id: inqId, name: '台式电脑', spec: 'i5/16G/512G', unit: '台', quantity: 20 });
  const i2 = await insert('inquiry_items', { inquiry_id: inqId, name: '显示器', spec: '24寸 1080P', unit: '台', quantity: 20 });
  const i3 = await insert('inquiry_items', { inquiry_id: inqId, name: '键鼠套装', spec: '无线', unit: '套', quantity: 20 });

  const quotes = [
    { sid: s1, days: 5, remark: '现货，含运费', prices: [3800, 800, 120] },
    { sid: s2, days: 7, remark: '可开发票', prices: [3650, 850, 110] },
    { sid: s3, days: 10, remark: '量大从优', prices: [3720, 780, 130] },
  ];
  for (const q of quotes) {
    const qid = await insert('quotations', {
      inquiry_id: inqId, supplier_id: q.sid, delivery_days: q.days,
      remark: q.remark, total_price: 0, awarded: 0, created_at: new Date().toISOString(),
    });
    const itemIds = [i1, i2, i3];
    const qtys = [20, 20, 20];
    let total = 0;
    for (let k = 0; k < 3; k++) {
      await insert('quotation_items', { quotation_id: qid, inquiry_item_id: itemIds[k], unit_price: q.prices[k] });
      total += q.prices[k] * qtys[k];
    }
    await update('quotations', { _id: qid }, { total_price: total });
  }
  console.log('[seed] 已初始化演示数据');
}

// 云函数冷启动只 seed 一次（模块级缓存）
let seeded = false;
async function ensureSeed() {
  if (seeded) return;
  try { await seed(); seeded = true; } catch (e) { console.error('[seed] 失败', e); }
}
ensureSeed();

// ---------- 用户 ----------
async function findUserByUsername(username) {
  return first('users', { username });
}
async function findUserById(id) {
  return first('users', { _id: id });
}
async function createUser({ username, password_hash, role, company, contact }) {
  const id = await insert('users', {
    username, password_hash, role, company: company || '', contact: contact || '',
    created_at: new Date().toISOString(),
  });
  return { id, username, role, company, contact };
}
async function userExists(username) {
  return (await count('users', { username })) > 0;
}

// ---------- 询价单 ----------
async function listInquiriesForBuyer(buyerId) {
  const rows = await list('inquiries', { buyer_id: buyerId });
  for (const r of rows) r.quote_count = await count('quotations', { inquiry_id: r._id });
  rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return rows;
}
async function listOpenInquiries(supplierId) {
  const rows = await list('inquiries', { status: 'open' });
  for (const r of rows) {
    r.buyer_company = (await findUserById(r.buyer_id) || {}).company || '';
    r.quote_count = await count('quotations', { inquiry_id: r._id });
    r.my_quoted = await count('quotations', { inquiry_id: r._id, supplier_id: supplierId });
  }
  rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return rows;
}
async function getInquiry(id) {
  return first('inquiries', { _id: id });
}
async function createInquiry({ buyer_id, title, description, deadline, items }) {
  const inqId = await insert('inquiries', {
    buyer_id, title, description: description || '', deadline, status: 'open',
    created_at: new Date().toISOString(),
  });
  for (const it of items) {
    await insert('inquiry_items', {
      inquiry_id: inqId, name: it.name, spec: it.spec || '', unit: it.unit || '', quantity: Number(it.quantity),
    });
  }
  return inqId;
}
async function closeInquiry(id) {
  return update('inquiries', { _id: id }, { status: 'closed' });
}
async function awardInquiry(inqId, quotationId) {
  await update('quotations', { inquiry_id: inqId }, { awarded: 0 });
  await update('quotations', { _id: quotationId }, { awarded: 1 });
  await update('inquiries', { _id: inqId }, { status: 'awarded' });
}
async function getInquiryItems(inqId) {
  const rows = await list('inquiry_items', { inquiry_id: inqId });
  rows.sort((a, b) => a._id.localeCompare(b._id));
  return rows;
}

// ---------- 报价 ----------
async function listQuotationsForInquiry(inqId) {
  const rows = await list('quotations', { inquiry_id: inqId });
  for (const q of rows) {
    const u = await findUserById(q.supplier_id);
    q.supplier_company = u ? u.company : '';
    q.supplier_contact = u ? u.contact : '';
    q.items = await getQuotationItems(q._id);
  }
  rows.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
  return rows;
}
async function getQuotationForSupplier(inqId, supplierId) {
  const q = await first('quotations', { inquiry_id: inqId, supplier_id: supplierId });
  if (q) { q.items = await getQuotationItems(q._id); }
  return q;
}
async function getQuotationById(id, inqId) {
  return first('quotations', { _id: id, inquiry_id: inqId });
}
async function getQuotationItems(qid) {
  const rows = await list('quotation_items', { quotation_id: qid });
  const items = await list('inquiry_items', {});
  rows.sort((a, b) => a.inquiry_item_id.localeCompare(b.inquiry_item_id));
  return rows.map((r) => {
    const ii = items.find((x) => x._id === r.inquiry_item_id) || {};
    return { ...r, name: ii.name, spec: ii.spec, unit: ii.unit, quantity: ii.quantity };
  });
}
async function upsertQuotation({ inquiry_id, supplier_id, delivery_days, remark, prices, inquiryItems }) {
  let q = await first('quotations', { inquiry_id, supplier_id });
  let qid;
  if (q) {
    qid = q._id;
  } else {
    qid = await insert('quotations', {
      inquiry_id, supplier_id, delivery_days: delivery_days || null, remark: remark || '',
      total_price: 0, awarded: 0, created_at: new Date().toISOString(),
    });
  }
  await remove('quotation_items', { quotation_id: qid });
  let total = 0;
  for (let k = 0; k < inquiryItems.length; k++) {
    const price = Number(prices[k]) || 0;
    await insert('quotation_items', { quotation_id: qid, inquiry_item_id: inquiryItems[k]._id, unit_price: price });
    total += price * inquiryItems[k].quantity;
  }
  await update('quotations', { _id: qid }, {
    delivery_days: delivery_days || null, remark: remark || '', total_price: total,
  });
  return qid;
}
async function listMyQuotations(supplierId) {
  const rows = await list('quotations', { supplier_id: supplierId });
  for (const q of rows) {
    const i = await getInquiry(q.inquiry_id);
    q.inquiry_title = i ? i.title : '';
    q.inquiry_status = i ? i.status : '';
    q.deadline = i ? i.deadline : '';
  }
  rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return rows;
}

module.exports = {
  db,
  ensureSeed,
  // users
  findUserByUsername, findUserById, createUser, userExists,
  // inquiries
  listInquiriesForBuyer, listOpenInquiries, getInquiry, createInquiry,
  closeInquiry, awardInquiry, getInquiryItems,
  // quotations
  listQuotationsForInquiry, getQuotationForSupplier, getQuotationById,
  upsertQuotation, listMyQuotations,
};
