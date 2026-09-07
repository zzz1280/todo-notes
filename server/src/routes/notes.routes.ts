import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { requireAuth } from '../middlewares/auth.middleware';
import { formatZodError } from '../lib/validation';

const router = Router();

// 本文件的所有路由都需要登录：把守卫挂在 Router 上，
// 只保护 /api/notes 下的路径，不影响 /health 和 /api/auth
router.use(requireAuth);

// ---------- 校验规则 ----------
const idParamSchema = z.coerce.number().int().positive();

const createSchema = z.object({
  title: z.string().min(1, { message: '标题不能为空' }).max(200),
  content: z.string().max(10000).nullish(),
  done: z.boolean().optional(),
  pinned: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
});

// 修改用：.partial() 把创建规则里的所有字段都变成可选——传了哪个才改哪个
const updateSchema = createSchema.partial();

// 列表的查询参数都是字符串，z.coerce 负责把 '2' 变成数字 2
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  done: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  pinned: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  tag: z.string().trim().min(1).max(30).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

// 把标签名数组变成数据库里的 Tag 记录（不存在就创建），返回记录列表
// 先去重，避免同一请求里两个同名标签并发 upsert 撞 unique 约束
function upsertTags(names: string[]) {
  return Promise.all(
    [...new Set(names)].map((name) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
}

const noteInclude = { tags: { select: { id: true, name: true } } } as const;

// ---------- 列表：只看自己的笔记，支持筛选 + 分页 ----------
router.get('/', async (req, res) => {
  const v = listQuerySchema.safeParse(req.query);
  if (!v.success) {
    return res.status(400).json({ error: '查询参数不合法', details: formatZodError(v.error) });
  }
  const { page, pageSize, done, pinned, tag, q } = v.data;

  // 拼装过滤条件：每个筛选项都是"有才加"
  const where: Prisma.NoteWhereInput = { authorId: req.userId! };
  if (done !== undefined) where.done = done;
  if (pinned !== undefined) where.pinned = pinned;
  if (tag) where.tags = { some: { name: tag } };
  if (q) where.OR = [{ title: { contains: q } }, { content: { contains: q } }];

  // 两个查询互不依赖，并行发出去更快
  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }], // 置顶在前，其余按最近修改
      include: noteInclude,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.note.count({ where }),
  ]);

  return res.json({ data: notes, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});

// ---------- 创建 ----------
router.post('/', async (req, res) => {
  const v = createSchema.safeParse(req.body);
  if (!v.success) {
    return res.status(400).json({ error: '入参不合法', details: formatZodError(v.error) });
  }
  const { title, content, done, pinned, tags } = v.data;

  const note = await prisma.note.create({
    data: {
      title,
      content: content ?? null,
      done: done ?? false,
      pinned: pinned ?? false,
      authorId: req.userId!, // 归属当前登录用户
      ...(tags ? { tags: { connect: (await upsertTags(tags)).map((t) => ({ id: t.id })) } } : {}),
    },
    include: noteInclude,
  });

  return res.status(201).json({ note });
});

// ---------- 详情 ----------
router.get('/:id', async (req, res) => {
  const id = idParamSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'id 必须是正整数' });
  }

  // where 同时约束 id 和归属：查不到 = 不存在 或 不是你的
  const note = await prisma.note.findFirst({
    where: { id: id.data, authorId: req.userId! },
    include: noteInclude,
  });

  // 返回 404 而不是 403：不向别人泄露"这篇笔记存在，只是不归你"
  if (!note) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  return res.json({ note });
});

// ---------- 修改：只改请求里带了的字段 ----------
router.patch('/:id', async (req, res) => {
  const id = idParamSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'id 必须是正整数' });
  }
  const v = updateSchema.safeParse(req.body);
  if (!v.success) {
    return res.status(400).json({ error: '入参不合法', details: formatZodError(v.error) });
  }
  const { title, content, done, pinned, tags } = v.data;

  const existing = await prisma.note.findFirst({ where: { id: id.data, authorId: req.userId! } });
  if (!existing) {
    return res.status(404).json({ error: '笔记不存在' });
  }

  // 未传的字段保持原样；tags 只要传了（哪怕空数组）就整体替换
  const data: Prisma.NoteUpdateInput = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) data.content = content;
  if (done !== undefined) data.done = done;
  if (pinned !== undefined) data.pinned = pinned;
  if (tags !== undefined) {
    data.tags = { set: (await upsertTags(tags)).map((t) => ({ id: t.id })) };
  }

  const note = await prisma.note.update({
    where: { id: id.data },
    data,
    include: noteInclude,
  });

  return res.json({ note });
});

// ---------- 删除 ----------
router.delete('/:id', async (req, res) => {
  const id = idParamSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'id 必须是正整数' });
  }

  // deleteMany 一次完成"校验归属 + 删除"，count 为 0 说明没有这条笔记或不归你
  const result = await prisma.note.deleteMany({
    where: { id: id.data, authorId: req.userId! },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  return res.status(204).send();
});

export default router;
