// CloudBase Node 云函数入口
// CloudBase 云函数收到的是 API 网关事件对象：
//   { httpMethod, path, headers, body, queryString, requestContext }
// 用 serverless-http 把 Express 应用适配成云函数。
const serverless = require('serverless-http');
const app = require('./app');

const handler = serverless(app, {
  request: (request, event) => {
    // CloudBase 事件里 path 已含 /api 前缀（由网关路由配置决定），保持原样即可
    request.url = event.path || request.url;
  },
});

exports.main = async (event, context) => {
  return handler(event, context);
};
