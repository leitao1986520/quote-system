const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

const router = express.Router();
router.use(authMiddleware, requireRole('buyer'));

// 导出询比价结果 Excel（由前端用 SheetJS 生成，这里提供结构化数据接口）
router.get('/inquiry/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const inquiry = await db.getInquiry(id);
    if (!inquiry || inquiry.buyer_id !== req.user.id) {
      return res.status(403).json({ error: '无权限' });
    }
    const items = await db.getInquiryItems(id);
    const quotations = await db.listQuotationsForInquiry(id);
    res.json({ inquiry, items, quotations });
  } catch (e) {
    res.status(500).json({ error: '导出失败：' + e.message });
  }
});

module.exports = router;
