const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// 列表：采购方看自己的；供应商看所有 open 的
router.get('/', async (req, res) => {
  try {
    const rows = req.user.role === 'buyer'
      ? await db.listInquiriesForBuyer(req.user.id)
      : await db.listOpenInquiries(req.user.id);
    res.json({ inquiries: rows });
  } catch (e) {
    res.status(500).json({ error: '查询失败：' + e.message });
  }
});

// 详情（含明细 + 报价 + 报价明细）
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const inquiry = await db.getInquiry(id);
    if (!inquiry) return res.status(404).json({ error: '询价单不存在' });

    if (req.user.role === 'buyer' && inquiry.buyer_id !== req.user.id) {
      return res.status(403).json({ error: '无权限' });
    }

    const items = await db.getInquiryItems(id);

    let quotations = [];
    if (req.user.role === 'buyer') {
      quotations = await db.listQuotationsForInquiry(id);
    } else {
      const my = await db.getQuotationForSupplier(id, req.user.id);
      if (my) quotations = [my];
    }

    res.json({ inquiry, items, quotations });
  } catch (e) {
    res.status(500).json({ error: '查询失败：' + e.message });
  }
});

// 发布询价（采购方）
router.post('/', requireRole('buyer'), async (req, res) => {
  const { title, description, deadline, items } = req.body || {};
  if (!title || !deadline) return res.status(400).json({ error: '标题和截止时间必填' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '请至少添加一项明细' });
  }
  const valid = items.every((it) => it.name && Number(it.quantity) > 0);
  if (!valid) return res.status(400).json({ error: '明细需包含名称且数量大于 0' });
  try {
    const inqId = await db.createInquiry({ buyer_id: req.user.id, title, description, deadline, items });
    res.json({ id: inqId, message: '发布成功' });
  } catch (e) {
    res.status(500).json({ error: '发布失败：' + e.message });
  }
});

// 关闭询价（采购方）
router.post('/:id/close', requireRole('buyer'), async (req, res) => {
  try {
    const inq = await db.getInquiry(req.params.id);
    if (!inq) return res.status(404).json({ error: '不存在' });
    if (inq.buyer_id !== req.user.id) return res.status(403).json({ error: '无权限' });
    await db.closeInquiry(req.params.id);
    res.json({ message: '已关闭' });
  } catch (e) {
    res.status(500).json({ error: '操作失败：' + e.message });
  }
});

// 定标：选中某报价（采购方）
router.post('/:id/award', requireRole('buyer'), async (req, res) => {
  const inqId = req.params.id;
  const { quotation_id } = req.body || {};
  try {
    const inq = await db.getInquiry(inqId);
    if (!inq || inq.buyer_id !== req.user.id) return res.status(403).json({ error: '无权限' });
    const q = await db.getQuotationById(quotation_id, inqId);
    if (!q) return res.status(404).json({ error: '报价不存在' });
    await db.awardInquiry(inqId, quotation_id);
    res.json({ message: '定标成功' });
  } catch (e) {
    res.status(500).json({ error: '操作失败：' + e.message });
  }
});

module.exports = router;
