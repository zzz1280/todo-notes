import { z } from 'zod';

// 把 zod 的报错整理成 [{ field: 'password', message: '密码至少 8 位' }]，
// 前端拿到后可以精确地在对应输入框旁边标红提示
export function formatZodError(error: z.ZodError) {
  return error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
}
