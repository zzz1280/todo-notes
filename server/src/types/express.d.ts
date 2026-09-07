// 告诉 TypeScript：Express 的 Request 对象上有一个我们自定义的 userId 字段。
// 登录守卫验证 token 通过后，会把"当前用户 id"写在这里，后续代码直接读取。
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export {};
