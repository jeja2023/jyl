# 甲友乐 生产镜像
#
# 分三个阶段：前端构建、服务端生产依赖、运行。这样做的原因：
#  1. 依赖用 npm ci 按 package-lock.json 精确安装，避免构建结果随时间漂移；
#  2. 服务端只装生产依赖，nodemon / sequelize-cli 不进运行镜像；
#  3. 源码 COPY 在 node_modules COPY 之前，杜绝上下文里的依赖目录覆盖容器内依赖
#     （配合根目录 .dockerignore，密钥文件和 node_modules 都进不来）。

# ---------- 1. 前端构建阶段 ----------
FROM node:24-alpine AS client-builder

WORKDIR /app/client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./

# 默认为空，前端请求将使用项目部署的相对路径（适合前后端同源部署）
# 空值会覆盖 client/.env.production 里的域名，这是刻意的：同源部署不需要绝对地址。
# 如需发布小程序或分域名部署，可在构建时通过 --build-arg VITE_API_BASE=https://api.yourdomain.com 传入
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build:h5

# ---------- 2. 服务端生产依赖阶段 ----------
FROM node:24-alpine AS server-deps

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
# --omit=dev 去掉 nodemon / sequelize-cli；optionalDependencies(ioredis) 仍会安装，
# 多实例部署配置 REDIS_URL 时限流才能共享计数
RUN npm ci --omit=dev && npm cache clean --force

# ---------- 3. 运行阶段 ----------
FROM node:24-alpine

# 容器内健康检查需要 wget/curl，alpine 自带的 busybox wget 够用，无需额外安装
WORKDIR /app

ENV NODE_ENV=production

# 先源码后依赖：即使上下文意外带入 node_modules，也会被后一步覆盖回正确版本
COPY server/ ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY --from=client-builder /app/client/dist/build/h5 ./client/dist/build/h5

EXPOSE 3000

# /health 在数据库未就绪时返回 503，所以这里能真实反映"可对外服务"
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1:${PORT:-3000}/api/health || exit 1

WORKDIR /app/server
CMD ["node", "index.js"]
