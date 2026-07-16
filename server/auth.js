const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'quote-system-dev-secret-change-me';

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 鉴权中间件
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// 角色校验
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: '无权限执行此操作' });
    }
    next();
  };
}

module.exports = { signToken, authMiddleware, requireRole, JWT_SECRET };
