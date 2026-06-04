# Cloudflare Pages 部署指南

## 前提
- GitHub 仓库已创建：https://github.com/DawnerWang-Andy/tinghua-blog
- 已 push 成功

## 部署步骤

### 1. 登录 Cloudflare
访问 https://dash.cloudflare.com/ 登录你的账号

### 2. 创建 Pages 项目
- 左侧菜单 → Workers & Pages → Pages
- 点击 "Create" → "Connect to Git"
- 授权 GitHub，选中 `DawnerWang-Andy/tinghua-blog`
- 开始设置

### 3. 构建设置（按下面填）
| 设置项 | 值 |
|--------|-----|
| 项目名称 | `tinghua-blog` |
| 生产分支 | `main` |
| 构建命令 | `hugo --gc` |
| 构建目录 | `public` |
| 环境变量 | HUGO_VERSION = `0.162.1` |

### 4. 添加环境变量
在构建页面底下点 "Environment variables (advanced)" → 添加：

```
HUGO_VERSION = 0.162.1
```

### 5. 点击 "Save and Deploy"

等待 2 分钟，Cloudflare 会自动：
1. 拉取 GitHub 代码
2. 安装 Hugo 0.162.1
3. 执行 `hugo --gc`
4. 把 `public/` 目录部署上线

### 6. 访问
部署成功后，你会得到一个域名：

```
https://tinghua-blog.pages.dev/
```

### 后续更新流程
以后每次更新小说只需要：

```bash
# 1. 在 content/novels/ 下写新文章
# 2. 本地预览（可选）
cd /Users/dawnerwang/polymer-study/tinghua
hugo server

# 3. push 到 GitHub（需要 VPN 或网络通畅时）
git add -A
git commit -m "feat: 更新第X章"
git push

# 4. Cloudflare 自动重新部署，约 1-2 分钟生效
```

### 自定义域名（可选）
- 在 Pages → tinghua-blog → Custom domains → Set up a custom domain
- 输入你的域名（如 `tinghua.com` 或 `tinghua.dawner.xyz`）
- 按照提示在 DNS 加 CNAME 记录
