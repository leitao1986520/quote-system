const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authMiddleware } = require('../auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  const { username, password, role, company, contact } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: '用户名、密码、角色必填' });
  }
  if (!['buyer', 'supplier'].includes(role)) {
    return res.status(400).json({ error: '角色不合法' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' });
  }
  if (await db.userExists(username)) return res.status(409).json({ error: '用户名已存在' });

  const hash = bcrypt.hashSync(password, 10);
  const created = await db.createUser({ username, password_hash: hash, role, company, contact });
  const user = { id: created.id, username: created.username, role: created.role, company: created.company, contact: created.contact };
  res.json({ token: signToken(user), user });
});

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  const user = await db.findUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const safe = { id: user._id, username: user.username, role: user.role, company: user.company, contact: user.contact };
  res.json({ token: signToken(safe), user: safe });
});

// 当前用户
router.get('/me', authMiddleware, async (req, res) => {
  const user = await db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user: { id: user._id, username: user.username, role: user.role, company: user.company, contact: user.contact, created_at: user.created_at } });
});

module.exports = router;
