// Vercel Serverless 函数入口（映射到 /api）
// 前端请求 /api/health 时，Vercel 把请求路由到本函数，req.url 为 /health，
// 这里补回 /api 前缀后交给 Express 应用处理。
const app = require('../server/app');

module.exports = (req, res) => {
  // 补回被 Vercel 路由吃掉的前缀
  const url = req.url && req.url !== '/' ? req.url : '';
  req.url = '/api' + url;
  return app(req, res);
};
