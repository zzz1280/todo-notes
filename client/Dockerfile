# 基础镜像仓库：默认官方 Docker Hub；国内网络构建时可用镜像站（compose 已自动处理）
ARG REGISTRY=docker.io/library

# ---------- 第一阶段：构建前端静态文件 ----------
FROM ${REGISTRY}/node:22-alpine AS build
WORKDIR /app

# 国内网络加速：npm 用淘宝源
ENV npm_config_registry=https://registry.npmmirror.com

COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY . .
# tsc 类型检查 + vite 打包，产物在 dist/ 目录
RUN npm run build

# ---------- 第二阶段：用极小的 nginx 镜像托管静态文件 ----------
FROM ${REGISTRY}/nginx:alpine
# 我们的自定义 nginx 配置：静态文件 + 把 /api 转发给后端容器
COPY nginx.conf /etc/nginx/conf.d/default.conf
# 只把构建产物拷进来——最终镜像里没有 node、没有源码，只有几十 MB 的 nginx + 静态文件
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
