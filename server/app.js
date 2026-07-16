// 共享的 Express 应用（本地 node index.js 与 Vercel 函数都引用它）
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('./db'); // 初始化数据库 + 种子
const authRoutes = require('./routes/auth');
const inquiryRoutes = require('./routes/inquiries');
const quotationRoutes = require('./routes/quotations');
const exportRoutes = require('./routes/export');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/export', exportRoutes);

// 本地生产构建时可托管前端产物；Vercel 上由静态托管处理，这里不影响
const webDist = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

module.exports = app;
