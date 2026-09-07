import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { formatZodError } from '../lib/validation';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ---------- 入参校验：格式不对的请求在门口就被打回 ----------
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: '密码至少 8 位' }),
  name: z.string().min(1).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// 用户信息"安全版"：挑选字段返回，永远不把密码哈希泄露给前端
function publicUser(user: { id: number; email: string; name: string | null }) {
  return { id: user.id, email: user.email, name: user.name };
}

// ---------- 注册 ----------
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: '入参不合法',
      details: formatZodError(parsed.error),
    });
  }

  const { email, password, name } = parsed.data;

  // 邮箱在 schema 里是 unique，这里先查一次给出友好提示
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: '该邮箱已被注册' });
  }

  // bcrypt.hash：把明文密码变成不可逆的哈希再入库
  // 第二个参数 10 是"计算强度"，越大越慢越难暴力破解
  // 同一个密码每次哈希结果都不同（bcrypt 自动加盐），但日后 compare 能认出"是不是同一个"
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashed, name },
  });

  // 注册即登录：直接把两张通行证发给前端
  return res.status(201).json({
    user: publicUser(user),
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  });
});

// ---------- 登录 ----------
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: '入参不合法',
      details: formatZodError(parsed.error),
    });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // 邮箱不存在和密码错误返回同一句话，不向外界泄露"这个邮箱注册过没有"
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  return res.json({
    user: publicUser(user),
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  });
});

// ---------- 换发通行证 ----------
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    return res.status(400).json({ error: '缺少 refreshToken' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    return res.json({ accessToken: signAccessToken(Number(payload.sub)) });
  } catch {
    return res.status(401).json({ error: 'refreshToken 无效或已过期，请重新登录' });
  }
});

// ---------- 我是谁：受保护路由的最小示例 ----------
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! }, // 走到这里说明守卫已验证过，id 一定存在
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  return res.json({ user });
});

export default router;
