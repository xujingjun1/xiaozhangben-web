# 小账本部署指南

## 部署架构

```
前端 (Vue 3) → Vercel
后端 (Node.js) → Railway
```

## 一、部署后端到 Railway

### 1. 准备工作

1. 注册 Railway 账号：https://railway.app
2. 安装 Railway CLI（可选）：`npm i -g @railway/cli`

### 2. 部署步骤

1. 登录 Railway 并创建新项目
2. 选择 "Deploy from GitHub Repo"
3. 选择 `xiaozhangben-web` 仓库
4. 选择 `api` 目录作为根目录
5. Railway 会自动检测 Node.js 项目并部署

### 3. 获取部署地址

部署成功后，Railway 会分配一个域名，格式类似：
```
https://your-project-name.up.railway.app
```

### 4. 环境变量（可选）

如果需要配置环境变量，在 Railway 项目设置中添加：
```
PORT=3001
```

## 二、部署前端到 Vercel

### 1. 准备工作

1. 注册 Vercel 账号：https://vercel.com
2. 安装 Vercel CLI（可选）：`npm i -g vercel`

### 2. 部署步骤

1. 登录 Vercel 并创建新项目
2. 选择 "Import Git Repository"
3. 选择 `xiaozhangben-web` 仓库
4. 配置项目设置：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 添加环境变量：
   ```
   VITE_API_URL=https://your-railway-url.up.railway.app/api
   ```
6. 点击 Deploy

### 3. 配置域名（可选）

在 Vercel 项目设置中可以添加自定义域名。

## 三、更新生产环境配置

部署前，更新 `.env.production` 文件：

```bash
VITE_API_URL=https://your-railway-url.up.railway.app/api
```

## 四、数据持久化

Railway 使用文件存储数据（`api/data/db.json`），需要注意：

1. Railway 重启时数据不会丢失
2. 建议定期备份 `db.json` 文件
3. 如需更高可靠性，可升级到 PostgreSQL

## 五、常见问题

### Q: 为什么 Railway 部署后数据会丢失？
A: Railway 使用临时文件系统，重启时数据会重置。建议：
   - 升级到 Railway Pro 使用持久化存储
   - 或迁移到 PostgreSQL 数据库

### Q: 如何查看后端日志？
A: 在 Railway 项目面板中点击 "View Logs"

### Q: 如何更新部署？
A: 推送代码到 GitHub 后，Vercel 和 Railway 会自动重新部署

## 六、本地开发

```bash
# 安装依赖
npm install
cd api && npm install

# 启动后端
cd api && node index.js

# 启动前端
npm run dev
```

## 七、项目结构

```
xiaozhangben-web/
├── api/                    # 后端代码
│   ├── index.js           # Express 服务器
│   ├── data/              # 数据存储目录
│   └── package.json
├── src/                   # 前端代码
│   ├── views/             # 页面组件
│   ├── services/          # API 服务
│   └── ...
├── .env                   # 开发环境变量
├── .env.production        # 生产环境变量
├── vercel.json            # Vercel 配置
└── package.json
```
