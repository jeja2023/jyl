# 1. 构建阶段 (Build Stage)
FROM node:18-alpine AS builder

WORKDIR /app

# 利用缓存安装依赖
COPY client/package*.json ./client/
RUN cd client && npm i

COPY server/package*.json ./server/
RUN cd server && npm i

# 复制源码
COPY client/ ./client/
COPY server/ ./server/

# 前端构建
RUN cd client && npm run build:h5

# 2. 运行阶段 (Run Stage)
FROM node:18-alpine

WORKDIR /app

# 仅复制运行所需的 server 源码和前端构建产物
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist/build/h5 ./client/dist/build/h5

EXPOSE 3000

# 启动服务
WORKDIR /app/server
CMD ["node", "index.js"]
