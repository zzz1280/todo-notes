import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt';

// 登录守卫：挂在需要登录才能访问的路由前面，比如：
//   router.get('/me', requireAuth, handler)
// 请求进来先过这一关：没带证 → 401；证无效/过期 → 401；
// 验证通过则把用户 id 写进 req.userId，再放行（next）给真正的处理函数。
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization; // 标准格式形如 "Bearer eyJhbGci..."
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.userId = Number(payload.sub);
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}
