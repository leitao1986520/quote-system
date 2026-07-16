const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// 列表：采购方看自己的；供应商看所有 open 的
router.get('/', (req, res) => {
  let rows;
  if (req.user.role === 'buyer') {
    rows = db.prepare(`
      SELECT i.*, (SELECT COUNT(*) FROM quotations q WHERE q.inquiry_id=i.id) AS quote_count
      FROM inquiries i WHERE i.buyer_id=? ORDER BY i.created_at DESC
    `).all(req.user.id);
  } else {
    rows = db.prepare(`
      SELECT i.*, u.company AS buyer_company,
        (SELECT COUNT(*) FROM quotations q WHERE q.inquiry_id=i.id) AS quote_count,
        (SELECT COUNT(*) FROM quotations q WHERE q.inquiry_id=i.id AND q.supplier_id=?) AS my_quoted
      FROM inquiries i JOIN users u ON u.id=i.buyer_id
      WHERE i.status='open' ORDER BY i.created_at DESC
    `).all(req.user.id);
  }
  res.json({ inquiries: rows });
});

// 详情（含明细 + 报价 + 报价明细）
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id=?').get(id);
  if (!inquiry) return res.status(404).json({ error: '询价单不存在' });

  // 权限：采购方只能看自己的；供应商只能看 open 的
  if (req.user.role === 'buyer' && inquiry.buyer_id !== req.user.id) {
    return res.status(403).json({ error: '无权限' });
  }
  if (req.user.role === 'supplier' && inquiry.status !== 'open') {
    // 仍允许看自己已报过的（awarded 可看结果）
  }

  const items = db.prepare('SELECT * FROM inquiry_items WHERE inquiry_id=? ORDER BY id').all(id);

  let quotations = [];
  if (req.user.role === 'buyer') {
    quotations = db.prepare(`
      SELECT q.*, u.company AS supplier_company, u.contact AS supplier_contact
      FROM quotations q JOIN users u ON u.id=q.supplier_id
      WHERE q.inquiry_id=? ORDER BY q.total_price ASC
    `).all(id);
    for (const q of quotations) {
      q.items = db.prepare(`
        SELECT qi.*, ii.name, ii.spec, ii.unit, ii.quantity
        FROM quotation_items qi JOIN inquiry_items ii ON ii.id=qi.inquiry_item_id
        WHERE qi.quotation_id=? ORDER BY ii.id
      `).all(q.id);
    }
  } else {
    // 供应商只看自己的报价
    const my = db.prepare(`
      SELECT q.*, u.company AS supplier_company FROM quotations q JOIN users u ON u.id=q.supplier_id
      WHERE q.inquiry_id=? AND q.supplier_id=?
    `).get(id, req.user.id);
    if (my) {
      my.items = db.prepare(`
        SELECT qi.*, ii.name, ii.spec, ii.unit, ii.quantity
        FROM quotation_items qi JOIN inquiry_items ii ON ii.id=qi.inquiry_item_id
        WHERE qi.quotation_id=? ORDER BY ii.id
      `).all(my.id);
      quotations = [my];
    }
  }

  res.json({ inquiry, items, quotations });
});

// 发布询价（采购方）
router.post('/', requireRole('buyer'), (req, res) => {
  const { title, description, deadline, items } = req.body || {};
  if (!title || !deadline) return res.status(400).json({ error: '标题和截止时间必填' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '请至少添加一项明细' });
  }
  const valid = items.every((it) => it.name && Number(it.quantity) > 0);
  if (!valid) return res.status(400).json({ error: '明细需包含名称且数量大于 0' });

  const tx = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO inquiries (buyer_id,title,description,deadline,status) VALUES (?,?,?,?,?)')
      .run(req.user.id, title, description || null, deadline, 'open');
    const inqId = info.lastInsertRowid;
    const ins = db.prepare('INSERT INTO inquiry_items (inquiry_id,name,spec,unit,quantity) VALUES (?,?,?,?,?)');
    for (const it of items) {
      ins.run(inqId, it.name, it.spec || null, it.unit || null, Number(it.quantity));
    }
    return inqId;
  });
  try {
    const inqId = tx();
    res.json({ id: inqId, message: '发布成功' });
  } catch (e) {
    res.status(500).json({ error: '发布失败：' + e.message });
  }
});

// 关闭询价（采购方）
router.post('/:id/close', requireRole('buyer'), (req, res) => {
  const inq = db.prepare('SELECT * FROM inquiries WHERE id=?').get(req.params.id);
  if (!inq) return res.status(404).json({ error: '不存在' });
  if (inq.buyer_id !== req.user.id) return res.status(403).json({ error: '无权限' });
  db.prepare("UPDATE inquiries SET status='closed' WHERE id=?").run(req.params.id);
  res.json({ message: '已关闭' });
});

// 定标：选中某报价（采购方）
router.post('/:id/award', requireRole('buyer'), (req, res) => {
  const inqId = req.params.id;
  const { quotation_id } = req.body || {};
  const inq = db.prepare('SELECT * FROM inquiries WHERE id=?').get(inqId);
  if (!inq || inq.buyer_id !== req.user.id) return res.status(403).json({ error: '无权限' });
  const q = db.prepare('SELECT * FROM quotations WHERE id=? AND inquiry_id=?').get(quotation_id, inqId);
  if (!q) return res.status(404).json({ error: '报价不存在' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE quotations SET awarded=0 WHERE inquiry_id=?').run(inqId);
    db.prepare('UPDATE quotations SET awarded=1 WHERE id=?').run(quotation_id);
    db.prepare("UPDATE inquiries SET status='awarded' WHERE id=?").run(inqId);
  });
  tx();
  res.json({ message: '定标成功' });
});

module.exports = router;
