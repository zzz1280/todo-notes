# 待办 / 笔记应用

一个从零开始的全栈学习项目：用户登录 + 数据库 + 前后端分离的待办/笔记应用。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + Vite + Tailwind CSS 4 + React Router 7 |
| 后端 | Node.js + Express 5 + TypeScript |
| ORM / 数据库 | Prisma + SQLite |
| 认证 | JWT（双 token）+ bcrypt |

## 目录结构

```
.
├── server/          # 后端 API
│   ├── prisma/      # 数据库 schema、迁移文件、SQLite 文件
│   ├── scripts/     # 冒烟测试脚本（npm test）
│   └── src/
│       ├── index.ts        # 入口：启动 HTTP 服务
│       ├── app.ts          # Express 应用：中间件 + 路由挂载
│       ├── routes/         # 路由（auth / notes / health）
│       ├── middlewares/    # 登录守卫
│       ├── lib/            # 公共模块（prisma、jwt、校验工具）
│       └── types/          # Express 类型扩展
└── client/          # 前端（React + Vite + Tailwind）
    └── src/
        ├── api/            # API 客户端：token 管理 + 401 自动换发重试
        ├── auth/           # 登录状态全局管理（Context）
        ├── components/     # 笔记卡片、编辑弹窗、路由守卫
        ├── pages/          # 登录/注册页、笔记主页
        └── lib/            # 工具函数（时间格式化）
```

## 快速开始

后端（默认 <http://localhost:3001>）：

```bash
cd server
npm install
cp .env.example .env   # 编辑 .env，填入随机生成的 JWT_SECRET
npx prisma migrate dev # 首次运行，生成 SQLite 数据库
npm run dev
```

前端（默认 <http://localhost:5173>，已配置代理转发 /api 到后端）：

```bash
cd client
npm install
npm run dev
```

浏览器打开 <http://localhost:5173> ，注册一个账号即可使用。

跑测试：`cd server && npm test`（需后端已启动），27 项断言覆盖认证与笔记增删改查全链路。

## Docker 部署（可选）

前提：本机装有 Docker Desktop（Windows/macOS）或 Docker Engine + Compose 插件。

国内网络请在根目录创建 `.env`（参考 `.env.example`），设置 `JWT_SECRET` 和 `DOCKER_REGISTRY=docker.m.daocloud.io/library`。

```bash
docker compose up --build -d   # 构建镜像并启动，然后打开 http://localhost:8080
docker compose down            # 停止并移除容器（数据保留在命名卷里，不丢）
docker compose down -v         # 连数据卷一起删除（彻底清空）
```

容器架构：

```
浏览器 → client 容器（nginx：托管前端静态文件，/api 反向代理）
              └→ server 容器（Node API，启动时自动执行数据库迁移）
                     └→ db_data 命名卷（SQLite 文件，容器销毁数据仍在）
```

## API 一览

| 方法 | 路径 | 说明 | 需要登录 |
|---|---|---|---|
| GET | /health | 健康检查（顺带验证数据库连通） | 否 |
| POST | /api/auth/register | 注册，成功即登录并返回 token | 否 |
| POST | /api/auth/login | 登录，返回 accessToken + refreshToken | 否 |
| POST | /api/auth/refresh | 用 refreshToken 换新的 accessToken | 否 |
| GET | /api/auth/me | 查看当前登录用户信息 | 是 |
| POST | /api/notes | 创建笔记/待办 | 是 |
| GET | /api/notes | 列表：支持 done / pinned / tag / q（搜索）筛选，page + pageSize 分页 | 是 |
| GET | /api/notes/:id | 笔记详情 | 是 |
| PATCH | /api/notes/:id | 修改（只改传了的字段） | 是 |
| DELETE | /api/notes/:id | 删除 | 是 |

需要登录的接口在请求头带 `Authorization: Bearer <accessToken>`。

## 开发路线图

- [x] 第 1 步：后端骨架 + 数据库模型（User / Note / Tag）
- [x] 第 2 步：注册 / 登录（bcrypt 密码哈希 + JWT 双 token 鉴权）
- [x] 第 3 步：笔记 / 待办 CRUD API + 标签筛选 + 权限隔离
- [x] 第 4 步：React 前端（登录/注册、笔记列表、筛选搜索、新建/编辑弹窗）
- [x] 第 5 步：前后端联调（浏览器端到端测试 11 项全部通过）
- [x] 第 6 步：Docker 部署（双容器 + 数据卷，`docker compose up` 一条命令启动）
