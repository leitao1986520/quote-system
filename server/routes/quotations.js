const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// 提交/修改报价（供应商）
router.post('/', requireRole('supplier'), async (req, res) => {
  const { inquiry_id, delivery_days, remark, prices } = req.body || {};
  if (!inquiry_id || !Array.isArray(prices)) {
    return res.status(400).json({ error: '参数不完整' });
  }
  try {
    const inq = await db.getInquiry(inquiry_id);
    if (!inq) return res.status(404).json({ error: '询价单不存在' });
    if (inq.status !== 'open') return res.status(400).json({ error: '该询价已截止，无法报价' });

    const inquiryItems = await db.getInquiryItems(inquiry_id);
    if (prices.length !== inquiryItems.length) {
      return res.status(400).json({ error: '报价明细行数不匹配' });
    }

    const qid = await db.upsertQuotation({
      inquiry_id, supplier_id: req.user.id, delivery_days, remark, prices, inquiryItems,
    });
    res.json({ id: qid, message: '报价已提交' });
  } catch (e) {
    res.status(500).json({ error: '提交失败：' + e.message });
  }
});

// 我的报价列表（供应商）
router.get('/mine', requireRole('supplier'), async (req, res) => {
  try {
    const rows = await db.listMyQuotations(req.user.id);
    res.json({ quotations: rows });
  } catch (e) {
    res.status(500).json({ error: '查询失败：' + e.message });
  }
});

module.exports = router;
