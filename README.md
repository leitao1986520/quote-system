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

## 生产部署（腾讯云 CloudBase，国内直连）

已改为部署到**腾讯云 CloudBase**：前端静态网站托管 + 后端云函数 + **云数据库**（数据持久保存，不再丢失）。
国内手机/电脑均可直接访问，解决了 Vercel / Render 域名被墙的问题。

- `cloudbaserc.json`（根）— CloudBase 项目配置：静态托管 `web/dist` + 云函数 `quote-api` + `/api` 路由转发
- `server/index.js` — CloudBase 云函数入口（`exports.main`），用 `serverless-http` 包装 Express
- `server/db.js` — 改用 CloudBase 云数据库（`@cloudbase/node-sdk`），替代本地 SQLite
- `server/app.js` — 共享 Express 应用（本地与云函数共用）
- 前端 `src/api.js` 走同源 `/api`，由云端 rewrite 转发到云函数

👉 详细图文步骤见 **[docs/云端部署教程.md](docs/云端部署教程.md)**。

### 本仓库部署速查（GitHub: leitao1986520/quote-system）

1. 安装 CloudBase CLI：`npm i -g @cloudbase/cli`
2. 登录：`tcb login`
3. 克隆并构建前端：`npm run build`（产出 `web/dist`）
4. 部署：`tcb framework deploy`（或 `tcb hosting deploy web/dist` + `tcb fn deploy quote-api`）
5. 在 CloudBase 控制台「云数据库」创建集合：`users / inquiries / inquiry_items / quotations / quotation_items`
6. 在云函数 `quote-api` 环境变量中设置：`JWT_SECRET`、`TCB_ENV`（云环境 ID）
7. 访问静态网站域名即可（国内直连）

环境变量：
- `JWT_SECRET=12d2b37ff2c00c43fbf1e09ebe0d7d010555df5729af7ac41ece00aa6e308801`
- `TCB_ENV=<你的云环境 ID，如 quote-system-1a2b3c>`

### 数据持久化（已解决）

数据库使用 **CloudBase 云数据库**，数据写入云端持久保存，**重启/重新部署不丢失**，适合正式使用。

### 本地生产构建（单端口，可选）

1. 前端构建：`cd web && npm run build`（产出 `web/dist`）
2. 后端已配置静态托管 `web/dist`，直接 `node index.js` 即可单端口（4000）访问
3. 建议用 pm2 / Docker 守护进程

> 云端部署时 esbuild 被本机安全软件拦截的问题不存在（云端是干净的 Linux 环境，自动构建）。

## 目录结构
```
quote-system/
├─ cloudbaserc.json   # CloudBase 部署配置
├─ server/   # 后端（CloudBase 云函数）
│  ├─ index.js        # 云函数入口（serverless-http 包装 Express）
│  ├─ app.js          # 共享 Express 应用
│  ├─ db.js           # CloudBase 云数据库适配层 + 种子
│  ├─ auth.js         # JWT
│  └─ routes/         # auth / inquiries / quotations / export
└─ web/      # 前端 React
```
