const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// 提交/修改报价（供应商）
router.post('/', requireRole('supplier'), (req, res) => {
  const { inquiry_id, delivery_days, remark, prices } = req.body || {};
  if (!inquiry_id || !Array.isArray(prices)) {
    return res.status(400).json({ error: '参数不完整' });
  }
  const inq = db.prepare('SELECT * FROM inquiries WHERE id=?').get(inquiry_id);
  if (!inq) return res.status(404).json({ error: '询价单不存在' });
  if (inq.status !== 'open') return res.status(400).json({ error: '该询价已截止，无法报价' });

  const inquiryItems = db.prepare('SELECT * FROM inquiry_items WHERE inquiry_id=? ORDER BY id').all(inquiry_id);
  if (prices.length !== inquiryItems.length) {
    return res.status(400).json({ error: '报价明细行数不匹配' });
  }

  const tx = db.transaction(() => {
    let qid = db.prepare('SELECT id FROM quotations WHERE inquiry_id=? AND supplier_id=?')
      .get(inquiry_id, req.user.id);
    if (qid) qid = qid.id;
    else qid = db.prepare(
      'INSERT INTO quotations (inquiry_id,supplier_id,delivery_days,remark,total_price) VALUES (?,?,?,?,0)'
    ).run(inquiry_id, req.user.id, delivery_days || null, remark || null).lastInsertRowid;

    // 删除旧明细，重写
    db.prepare('DELETE FROM quotation_items WHERE quotation_id=?').run(qid);
    const ins = db.prepare('INSERT INTO quotation_items (quotation_id,inquiry_item_id,unit_price) VALUES (?,?,?)');
    let total = 0;
    inquiryItems.forEach((ii, idx) => {
      const price = Number(prices[idx]) || 0;
      ins.run(qid, ii.id, price);
      total += price * ii.quantity;
    });
    db.prepare('UPDATE quotations SET delivery_days=?, remark=?, total_price=? WHERE id=?')
      .run(delivery_days || null, remark || null, total, qid);
    return qid;
  });

  try {
    const qid = tx();
    res.json({ id: qid, message: '报价已提交' });
  } catch (e) {
    res.status(500).json({ error: '提交失败：' + e.message });
  }
});

// 我的报价列表（供应商）
router.get('/mine', requireRole('supplier'), (req, res) => {
  const rows = db.prepare(`
    SELECT q.*, i.title AS inquiry_title, i.status AS inquiry_status, i.deadline
    FROM quotations q JOIN inquiries i ON i.id=q.inquiry_id
    WHERE q.supplier_id=? ORDER BY q.created_at DESC
  `).all(req.user.id);
  res.json({ quotations: rows });
});

module.exports = router;
