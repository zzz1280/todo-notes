// 冒烟测试：按真实使用顺序把"注册→登录→笔记增删改查→权限隔离"整条链路跑一遍。
// 用法：先启动服务（npm run dev），另开终端运行 npm test。
// 全部通过打印 ✅；任何一项失败打印 ❌，并以非 0 退出码结束（方便以后接 CI）。

const BASE = process.env.BASE_URL ?? 'http://localhost:3001';

let passed = 0;
let failed = 0;

function check(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.log(`❌ ${name} ${extra}`);
  }
}

// 一个极简的 fetch 封装：自动带 JSON 头和登录 token
async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null); // 204 等空响应体解析会失败，容忍之
  return { status: res.status, body: data };
}

// 随机后缀：让脚本可以反复运行，不会撞上之前的测试用户
const uniq = Date.now();
const alice = `alice-${uniq}@test.com`;
const bob = `bob-${uniq}@test.com`;

// ============ 认证 ============
let r = await api('POST', '/api/auth/register', {
  body: { email: alice, password: 'password123', name: 'Alice' },
});
check('注册返回 201 和两张 token', r.status === 201 && !!r.body.accessToken && !!r.body.refreshToken);
const aliceToken = r.body.accessToken;

r = await api('POST', '/api/auth/register', { body: { email: alice, password: 'password123' } });
check('重复注册被拒 409', r.status === 409);

r = await api('POST', '/api/auth/login', { body: { email: alice, password: 'wrong-pass' } });
check('错误密码被拒 401', r.status === 401);

r = await api('POST', '/api/auth/login', { body: { email: alice, password: 'password123' } });
check('正确密码登录 200', r.status === 200 && r.body.user.email === alice);

const refreshBody = r.body.refreshToken;
r = await api('POST', '/api/auth/refresh', { body: { refreshToken: refreshBody } });
check('refreshToken 能换发新 accessToken', r.status === 200 && !!r.body.accessToken);

r = await api('GET', '/api/auth/me', {});
check('无 token 访问受保护接口被拒 401', r.status === 401);

r = await api('GET', '/api/auth/me', { token: aliceToken });
check('带 token 能查到当前用户', r.status === 200 && r.body.user.email === alice);

// ============ 创建笔记 ============
r = await api('POST', '/api/notes', {
  token: aliceToken,
  body: { title: '买牛奶', content: '低脂的', tags: ['生活', '购物'] },
});
check('创建带标签的笔记 201', r.status === 201 && r.body.note.title === '买牛奶' && r.body.note.tags.length === 2);
const milkId = r.body.note.id;

r = await api('POST', '/api/notes', { token: aliceToken, body: { title: '写周报', done: true, tags: ['工作'] } });
check('创建待办（done=true）201', r.status === 201 && r.body.note.done === true);
const reportId = r.body.note.id;

r = await api('POST', '/api/notes', {
  token: aliceToken,
  body: { title: 'Prisma 学习笔记', content: 'migration 用法', pinned: true },
});
check('创建置顶笔记 201', r.status === 201 && r.body.note.pinned === true);
const studyId = r.body.note.id;

r = await api('POST', '/api/notes', { token: aliceToken, body: { title: '' } });
check('空标题被校验打回 400', r.status === 400);

// ============ 列表 / 筛选 / 分页 ============
r = await api('GET', '/api/notes', { token: aliceToken });
check(
  '列表返回 3 条且置顶在前',
  r.status === 200 && r.body.total === 3 && r.body.data[0].id === studyId,
);
check('分页字段齐全', r.body.page === 1 && r.body.pageSize === 20 && r.body.totalPages === 1);

r = await api('GET', '/api/notes?done=true', { token: aliceToken });
check('按 done 筛选只剩待办', r.body.total === 1 && r.body.data[0].id === reportId);

r = await api('GET', '/api/notes?tag=工作', { token: aliceToken });
check('按标签筛选', r.body.total === 1 && r.body.data[0].id === reportId);

r = await api('GET', '/api/notes?q=Prisma', { token: aliceToken });
check('按关键词搜索标题', r.body.total === 1 && r.body.data[0].id === studyId);

r = await api('GET', '/api/notes?page=1&pageSize=2', { token: aliceToken });
check('分页：每页 2 条共 2 页', r.body.data.length === 2 && r.body.totalPages === 2);

// ============ 详情 / 修改 ============
r = await api('GET', `/api/notes/${milkId}`, { token: aliceToken });
check('查详情', r.status === 200 && r.body.note.content === '低脂的');

r = await api('PATCH', `/api/notes/${milkId}`, {
  token: aliceToken,
  body: { done: true, pinned: true },
});
check(
  'PATCH 只改指定字段（标题不变）',
  r.status === 200 && r.body.note.done === true && r.body.note.title === '买牛奶',
);

r = await api('PATCH', `/api/notes/${milkId}`, { token: aliceToken, body: { tags: ['生活'] } });
check('PATCH 整体替换标签（2 个 -> 1 个）', r.body.note.tags.length === 1 && r.body.note.tags[0].name === '生活');

// ============ 权限隔离：bob 碰不了 alice 的笔记 ============
r = await api('POST', '/api/auth/register', { body: { email: bob, password: 'password123' } });
const bobToken = r.body.accessToken;

r = await api('GET', `/api/notes/${milkId}`, { token: bobToken });
check('bob 读 alice 的笔记 -> 404', r.status === 404);

r = await api('PATCH', `/api/notes/${milkId}`, { token: bobToken, body: { title: '被篡改了' } });
check('bob 改 alice 的笔记 -> 404', r.status === 404);

r = await api('DELETE', `/api/notes/${milkId}`, { token: bobToken });
check('bob 删 alice 的笔记 -> 404', r.status === 404);

r = await api('GET', '/api/notes', { token: bobToken });
check('bob 的列表是空的（数据隔离）', r.status === 200 && r.body.total === 0);

// ============ 删除 ============
r = await api('DELETE', `/api/notes/${milkId}`, { token: aliceToken });
check('owner 删除 -> 204', r.status === 204);

r = await api('GET', `/api/notes/${milkId}`, { token: aliceToken });
check('删除后再查 -> 404', r.status === 404);

r = await api('GET', '/api/notes', { token: aliceToken });
check('删除后列表总数减一', r.body.total === 2);

console.log(`\n结果：${passed} 通过，${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
