# 把代码推送到 GitHub（零基础完整指南）

> 适用：还没有 GitHub 账号、不会用 git 的小白。全程免费，约 10 分钟。
> 说明：你当前的公司电脑对外网大文件下载有限制、且没有安装 git，因此最后一步
> 建议在**家里电脑 / 个人笔记本**（Windows / Mac 均可）上完成。下面的步骤在普通电脑上通用。

---

## 第 1 步：注册 GitHub（免费）

1. 打开 https://github.com
2. 点右上角 **Sign up**（注册）
3. 填邮箱 → 设密码 → 取用户名（如 `sn08912`）→ 验证邮箱
4. 注册完成，无需付费，选 Free 方案即可

---

## 第 2 步：在 GitHub 上新建仓库

1. 登录后，点右上角 **+ → New repository**
2. 填：
   - **Repository name**：`quote-system`
   - **Description**（可选）：在线报价系统
   - 选 **Public**（免费；Private 也免费，但部署平台拉取需授权，初学者先用 Public 最简单）
   - **不要**勾选 "Add a README file"（我们已有代码）
3. 点 **Create repository**
4. 创建后会看到一个空仓库页面，记下它的地址，形如：
   ```
   https://github.com/你的用户名/quote-system.git
   ```
   下面命令里的 `<仓库地址>` 就替换成它。

---

## 第 3 步：在电脑上安装 git

### Windows
1. 打开 https://git-scm.com/download/win
2. 下载 64-bit 安装包，双击安装，**一路 Next**（默认选项即可）
3. 安装完，右键桌面空白处 → "Git Bash Here"，能打开黑窗口即成功

### Mac
打开终端，执行 `git --version`；若没装，按提示点"安装命令行开发者工具"。

---

## 第 4 步：把代码推上去

把 `quote-system/` 整个文件夹拷到这台电脑（U 盘 / 网盘 / 或直接在你公司电脑能联网的机器上做）。
在该文件夹里打开终端（Windows 用 Git Bash），依次执行：

```bash
# 进入项目目录（请改成你实际的路径）
cd quote-system

# 初始化 git
git init
git branch -M main

# 添加所有文件（.env、node_modules、dist 已被 .gitignore 排除，不会上传）
git add .

# 提交
git commit -m "初始化在线报价系统"

# 关联远程仓库（把地址换成你第 2 步记下的）
git remote add origin https://github.com/你的用户名/quote-system.git

# 推送
git push -u origin main
```

> 首次 push 会弹出登录框：选 **Sign in with browser**（浏览器登录你的 GitHub 账号授权）即可。
> 若用令牌方式：GitHub 已不支持密码登录，浏览器授权是最简单的。

---

## 第 5 步：确认成功

刷新 https://github.com/你的用户名/quote-system ，能看到 `server/`、`web/`、`docs/` 等目录即成功。

之后改了代码，只需：
```bash
git add .
git commit -m "说明改了什么"
git push
```
Render 和 Vercel 会自动重新部署。

---

## 常见问题

**Q：push 时提示 Authentication failed？**
GitHub 已停用密码登录，请用"浏览器授权"方式（弹窗登录），或生成 Personal Access Token 当作密码用。

**Q：公司电脑装不了 git / 下载慢？**
用家里电脑或任意能正常上网的机器操作即可，代码拷过去就行。

**Q：不想用 GitHub，能用国内的吗？**
可以换成 **Gitee（码云）** https://gitee.com ，操作几乎一样，且国内访问更快；
Render / Vercel 也支持从 Gitee 拉取（Vercel 需连 GitHub，Render 可连 Gitee）。
