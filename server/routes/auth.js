const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authMiddleware } = require('../auth');

const router = express.Router();

// 注册
router.post('/register', (req, res) => {
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
  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (exists) return res.status(409).json({ error: '用户名已存在' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (username,password_hash,role,company,contact) VALUES (?,?,?,?,?)')
    .run(username, hash, role, company || null, contact || null);
  const user = db.prepare('SELECT id,username,role,company,contact FROM users WHERE id=?').get(info.lastInsertRowid);
  res.json({ token: signToken(user), user });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const safe = { id: user.id, username: user.username, role: user.role, company: user.company, contact: user.contact };
  res.json({ token: signToken(safe), user: safe });
});

// 当前用户
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id,username,role,company,contact,created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user });
});

module.exports = router;
