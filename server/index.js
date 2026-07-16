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

// 生产环境托管前端构建产物
const webDist = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`报价系统后端已启动: http://localhost:${PORT}`);
});
