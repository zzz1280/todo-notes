# 待办 / 笔记应用

一个从零开始的全栈学习项目：用户登录 + 数据库 + 前后端分离的待办/笔记应用。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + Vite + Tailwind CSS |
| 后端 | Node.js + Express 5 + TypeScript |
| ORM / 数据库 | Prisma + SQLite |
| 认证 | JWT（双 token）+ bcrypt |

## 目录结构

```
.
├── server/          # 后端 API
│   ├── prisma/      # 数据库 schema、迁移文件、SQLite 文件
│   └── src/
│       ├── index.ts        # 入口：启动 HTTP 服务
│       ├── app.ts          # Express 应用：中间件 + 路由挂载
│       ├── routes/         # 路由
│       └── lib/            # 公共模块（如 prisma 客户端）
└── client/          # 前端（后续步骤创建）
```

## 快速开始（后端）

```bash
cd server
npm install
npx prisma migrate dev   # 首次运行，生成 SQLite 数据库
npm run dev              # 启动开发服务器，默认 http://localhost:3001
```

验证：浏览器打开 http://localhost:3001/health ，应返回 `{"status":"ok",...}`。

查看数据：`npm run db:studio` 会打开 Prisma Studio（可视化数据库客户端）。

跑测试：`npm test` 会按真实使用顺序把所有接口完整测一遍（需服务已启动）。

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
- [ ] 第 4 步：React + Vite + Tailwind 前端
- [ ] 第 5 步：前后端联调（登录态管理、受保护路由）
- [ ] 第 6 步（可选）：Docker 部署
