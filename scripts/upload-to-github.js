#!/usr/bin/env node
/**
 * 无需安装 git，直接通过 GitHub API 把源码上传到新仓库。
 * 适用：本机装不了 git、但又要把代码推到 GitHub 的场景。
 *
 * 用法：
 *   1) 去 https://github.com -> Settings -> Developer settings -> Personal access tokens
 *      生成一个有 "repo" 权限的 token（repo 勾全部）
 *   2) 设置环境变量并运行：
 *        $env:GITHUB_TOKEN="你的token"
 *        $env:GITHUB_OWNER="你的用户名"
 *        $env:REPO_NAME="quote-system"   # 可选，默认 quote-system
 *        node scripts/upload-to-github.js
 *
 * 说明：会跳过 node_modules / dist / .git / server/data / .env 等（不会上传依赖与密钥）。
 */
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.REPO_NAME || 'quote-system';
const ROOT = path.join(__dirname, '..');

if (!TOKEN || !OWNER) {
  console.error('缺少环境变量：请设置 GITHUB_TOKEN 和 GITHUB_OWNER');
  process.exit(1);
}

// 需要跳过的目录 / 文件
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'data']);
const SKIP_FILES = new Set(['.env', '.DS_Store']);
function isSkippedFile(name) {
  if (SKIP_FILES.has(name)) return true;
  if (name.endsWith('.log')) return true;
  return false;
}

// 收集要上传的文件
function collect(dir, base, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    const full = path.join(dir, name);
    const rel = path.join(base, name).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      collect(full, rel, out);
    } else {
      if (isSkippedFile(name)) continue;
      // 只上传文本类源码/配置文件
      if (!/\.(js|jsx|ts|tsx|json|md|html|css|yml|yaml|example|toml|txt)$/i.test(name) &&
          !name.startsWith('.env')) continue;
      out.push({ rel, full });
    }
  }
}

const files = [];
collect(ROOT, '', files);

async function github(method, apiPath, body) {
  const res = await fetch('https://api.github.com' + apiPath, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'User-Agent': 'quote-system-uploader',
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

(async () => {
  // 1) 建仓库（若已存在会报 422，忽略）
  const createRes = await github('POST', '/user/repos', {
    name: REPO,
    description: '在线报价系统（采购询价 / 供应商报价 / 比价定标 / Excel 导出）',
    private: false,
    auto_init: false,
  });
  if (createRes.status === 201) console.log('✓ 仓库已创建:', REPO);
  else if (createRes.status === 422) console.log('· 仓库已存在，继续上传');
  else {
    console.error('建仓库失败:', createRes.status, JSON.stringify(createRes.data).slice(0, 300));
    process.exit(1);
  }

  // 2) 获取远程现有文件清单（用于删除本地已移除的文件）
  const localRels = new Set(files.map((f) => f.rel));
  const treeRes = await github('GET', `/repos/${OWNER}/${REPO}/git/trees/main?recursive=1`);
  const remoteFiles = treeRes.status === 200 && treeRes.data.tree
    ? treeRes.data.tree.filter((t) => t.type === 'blob').map((t) => t.path)
    : [];
  for (const rel of remoteFiles) {
    const skip = ['node_modules/', 'dist/', '.git/', 'data/'].some((p) => rel.startsWith(p));
    if (skip) continue;
    if (!localRels.has(rel)) {
      const getRes = await github('GET', `/repos/${OWNER}/${REPO}/contents/${rel}`);
      if (getRes.status === 200) {
        const delRes = await github('DELETE', `/repos/${OWNER}/${REPO}/contents/${rel}`, {
          message: `remove ${rel}`,
          sha: getRes.data.sha,
        });
        console.log(delRes.status === 200 ? '✗删' : '✗删除失败', rel);
      }
    }
  }

  // 3) 逐个上传文件（存在则更新 SHA）
  for (const f of files) {
    const content = fs.readFileSync(f.full);
    const b64 = content.toString('base64');
    // 查询是否已有该文件以获取 sha
    const getRes = await github('GET', `/repos/${OWNER}/${REPO}/contents/${f.rel}`);
    const sha = getRes.status === 200 ? getRes.data.sha : undefined;
    const putRes = await github('PUT', `/repos/${OWNER}/${REPO}/contents/${f.rel}`, {
      message: `add ${f.rel}`,
      content: b64,
      sha,
    });
    if (putRes.status === 200 || putRes.status === 201) {
      console.log('✓', f.rel);
    } else {
      console.error('✗ 上传失败', f.rel, putRes.status, JSON.stringify(putRes.data).slice(0, 200));
    }
  }
  console.log('\n完成！仓库地址: https://github.com/' + OWNER + '/' + REPO);
})();
