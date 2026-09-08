# 基础镜像仓库：默认官方 Docker Hub；国内网络构建时可用
# --build-arg REGISTRY=docker.m.daocloud.io/library 切换到镜像站（compose 已自动处理）
ARG REGISTRY=docker.io/library

# 后端镜像：Node 22 精简版
FROM ${REGISTRY}/node:22-alpine
WORKDIR /app

# 国内网络加速：npm 用淘宝源，Prisma 引擎用 npmmirror 的二进制镜像
ENV npm_config_registry=https://registry.npmmirror.com
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

# 先只拷贝依赖清单和数据库 schema，再装依赖——
# 这两层有缓存：只要没换依赖包，改代码重新构建时不会重新下载几百兆依赖
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-fund --no-audit && npx prisma generate

# 再拷贝业务源码
COPY . .

EXPOSE 3001

# 容器启动时先执行数据库迁移（生产级命令，只应用已记录的迁移，不会有交互式提示），再启动服务
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
