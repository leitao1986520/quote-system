# 在线报价系统

采购方发布询价、供应商在线报价、比价定标、导出 Excel 的轻量级系统。
免费开源、响应式（手机/电脑可用）、SQLite 零配置数据库。

## 功能

- 账号体系（采购方 / 供应商，JWT 鉴权）
- 采购方：发布询价（多行明细）、查看报价、比价、定标
- 供应商：询价大厅浏览、在线报价（单价自动算总价）、查看中选状态
- 询比价结果一键导出 Excel

## 技术栈

- 前端：React 18 + Vite + Ant Design 5 + SheetJS(xlsx)
- 后端：Node.js + Express + better-sqlite3
- 鉴权：JWT + bcrypt

## 快速开始

### 1. 启动后端
```bash
cd server
npm install        # 若 better-sqlite3 报错，先执行：npm rebuild better-sqlite3
npm start          # 默认 http://localhost:4000
```
首次启动会自动建库并写入演示数据。

### 2. 启动前端
```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

> 依赖安装完成后，建议用 `npm run build` 生成 `web/dist`，后端已配置静态托管该目录，
> 生产环境直接 `node index.js` 即可单端口（4000）访问整套系统。

## ⚠️ 关于构建工具（esbuild）被安全软件拦截

部分公司电脑的终端安全软件（如 CrowdStrike / 360 / 火绒等）会 hook `esbuild` 这个
原生二进制对文件的读取，导致 `npm run dev` / `npm run build` 报类似
`Unexpected "\x88" in JSON`（package.json 被读成乱码）。

**判断方法**：用 node 直接读 `package.json` 正常，但 esbuild 读就乱码。

**解决办法（任选其一）**：
1. 在不受限的电脑 / 云服务器 / CI 上执行 `npm install && npm run build`（代码本身完全正确，标准环境可直接运行）。
2. 向公司 IT 申请把项目目录（或 `node_modules/@esbuild`、`node_modules/esbuild`）加入安全软件白名单。
3. 将项目放到安全软件不扫描的路径（如独立数据盘的非系统目录）后重试。

后端（Node + Express + SQLite）不依赖 esbuild，已验证可正常启动与运行。

### 演示账号
| 角色 | 用户名 | 密码 |
|---|---|---|
| 采购方 | buyer | buyer123 |
| 供应商1 | supplier1 | sup123 |
| 供应商2 | supplier2 | sup123 |
| 供应商3 | supplier3 | sup123 |

## 生产部署（免费云端，推荐）

已为 **Render（后端）+ Vercel（前端）** 免费方案做好配置，零成本、手机电脑均可访问：

- `quote-system/render.yaml` — Render 后端部署配置（免费层，Node 自动构建）
- `quote-system/web/vercel.json` — Vercel 前端配置（把 `/api` 代理到后端）
- `quote-system/server/.env.example` / `quote-system/web/.env.example` — 环境变量样例
- 前端 `src/api.js` 已支持 `VITE_API_BASE` 环境变量，本地仍走 `/api` 代理

👉 详细图文步骤见 **[docs/云端部署教程.md](docs/云端部署教程.md)**（面向零基础，约 10 分钟完成）。

### 本地生产构建（单端口）

1. 前端构建：`cd web && npm run build`（产出 `web/dist`）
2. 后端已配置静态托管 `web/dist`，直接 `node index.js` 即可单端口（4000）访问
3. 建议用 pm2 / Docker 守护进程

> 云端部署时 esbuild 被本机安全软件拦截的问题不存在（云端是干净的 Linux 环境，自动构建）。

## 目录结构
```
quote-system/
├─ server/   # 后端
│  ├─ index.js
│  ├─ db.js          # SQLite 建表 + 种子
│  ├─ auth.js        # JWT
│  └─ routes/        # auth / inquiries / quotations / export
└─ web/      # 前端 React
```
