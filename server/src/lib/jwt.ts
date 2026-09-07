import jwt, { type JwtPayload } from 'jsonwebtoken';

// 读取必需的环境变量：缺失就直接报错停止启动，避免"不带锁的服务器"悄悄跑起来
// （单独包成函数，是因为 TS 的"非空收窄"只在同一函数体内生效，包一层返回值就永远是 string）
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量 ${name}，请在 server/.env 中配置`);
  }
  return value;
}

const JWT_SECRET = requiredEnv('JWT_SECRET');

// 双 token 设计：
// - accessToken（通行证）：短命，15 分钟。前端每次请求都带着它。
// - refreshToken（换发凭证）：长命，7 天。只在通行证过期时用来换一张新的。
// 好处：通行证即使被偷，小偷最多用 15 分钟；而用户 7 天内不用重新登录。
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

// jwt.verify 的返回值类型很宽泛，统一解析成我们只关心的两个字段
function parsePayload(payload: string | JwtPayload): { sub: string; type?: string } {
  if (typeof payload === 'string') {
    throw new Error('非法的 token 载荷');
  }
  return { sub: String(payload.sub), type: payload.type as string | undefined };
}

export function signAccessToken(userId: number): string {
  // sub 是 JWT 标准字段，约定放"这张证是谁的"（用户 id）
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(userId: number): string {
  // 多打一个 type: 'refresh' 标记，防止有人拿 accessToken 来冒充换发凭证
  return jwt.sign({ sub: String(userId), type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

// 校验失败或过期会抛异常，由调用方决定返回什么响应
export function verifyAccessToken(token: string): { sub: string } {
  return parsePayload(jwt.verify(token, JWT_SECRET));
}

export function verifyRefreshToken(token: string): { sub: string } {
  const payload = parsePayload(jwt.verify(token, JWT_SECRET));
  if (payload.type !== 'refresh') {
    throw new Error('这不是一张换发凭证');
  }
  return payload;
}
