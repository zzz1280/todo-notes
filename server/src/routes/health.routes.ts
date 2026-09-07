import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// 健康检查：顺带执行一条 SQL 验证数据库连通性
router.get('/', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router;
