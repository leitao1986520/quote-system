const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

const router = express.Router();
router.use(authMiddleware, requireRole('buyer'));

// 导出询比价结果 Excel（由前端用 SheetJS 生成，这里提供结构化数据接口）
router.get('/inquiry/:id', (req, res) => {
  const id = req.params.id;
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id=?').get(id);
  if (!inquiry || inquiry.buyer_id !== req.user.id) {
    return res.status(403).json({ error: '无权限' });
  }
  const items = db.prepare('SELECT * FROM inquiry_items WHERE inquiry_id=? ORDER BY id').all(id);
  const quotations = db.prepare(`
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
  res.json({ inquiry, items, quotations });
});

module.exports = router;
