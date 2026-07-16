// 本地启动入口（node index.js / npm start）
const app = require('./app');
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`报价系统后端已启动: http://localhost:${PORT}`);
});
