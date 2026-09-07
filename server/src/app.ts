import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import healthRouter from './routes/health.routes';
import authRouter from './routes/auth.routes';
import notesRouter from './routes/notes.routes';

const app = express();

// 中间件：解析 JSON 请求体；允许前端开发服务器跨域访问
app.use(cors());
app.use(express.json());

// 路由挂载：后续会陆续加上 /api/notes 等
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);

// 兜底 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 统一错误处理：Express 5 会把异步路由抛出的错误送到这里
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
