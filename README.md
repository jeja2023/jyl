# 甲友乐 JYL

甲友乐是一款专为甲状腺疾病患者设计的健康管理应用，帮助用户记录化验指标、管理用药提醒、追踪健康趋势。

## 项目结构

```
jyl/
├── client/          # 前端 (uni-app + Vue3)
│   ├── src/
│   │   ├── pages/       # 页面文件
│   │   ├── store/       # Pinia 状态管理
│   │   ├── utils/       # 工具函数
│   │   └── static/      # 静态资源
│   └── package.json
│
└── server/          # 后端 (Koa + Sequelize)
    ├── controllers/     # 控制器
    ├── models/          # 数据模型
    ├── middlewares/     # 中间件
    ├── routes/          # 路由
    ├── utils/           # 工具类
    └── package.json
```

## 功能特性

- 🩺 **甲功指标记录**：支持 TSH、FT3、FT4、抗体等完整甲功五项/七项录入
- 📊 **趋势追踪**：以时间轴形式展示历史化验记录，直观查看指标变化
- ⏰ **用药提醒**：自定义服药时间和剂量，支持智能健康贴士推送
- 📚 **健康百科**：提供甲状腺疾病相关的科普文章、饮食建议及检查解读
- 🔐 **安全认证**：JWT + bcrypt 双重保障用户数据安全
- 📱 **跨平台**：基于 uni-app，支持 H5、小程序、App 多端运行

## 快速开始

### 环境要求

- Node.js >= 16
- MySQL >= 5.7

### 后端启动

```bash
cd server
npm install
# 配置 .env 文件
npm run dev
```

### 前端启动

```bash
cd client
npm install
npm run dev:h5      # H5 预览（支持局域网手机访问）
npm run dev:mp-weixin  # 微信小程序
```

> **提示**：如果是 H5 模式，在局域网内通过手机访问时（如 `http://192.168.x.x:5173`），请求地址会自动指向对应的后端 IP，无需手动更改配置。

## 环境配置

复制 `server/.env.example` 为 `server/.env`，并配置：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASS=your_password
DB_NAME=jyl
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=24h
ADMIN_USER=admin
ADMIN_PASS=123456
```

## 技术栈

**前端**
- Vue 3 + Composition API
- uni-app 跨平台框架
- uview-plus UI 组件库
- Pinia 状态管理
- luch-request 网络请求

**后端**
- Koa 2 Web 框架
- Sequelize ORM
- MySQL 数据库
- JWT 身份认证
- bcryptjs 密码加密

## 许可证

MIT License
