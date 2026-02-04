# 甲友乐 JYL

> **⚠️ 重要声明：** 甲友乐是一款专为甲状腺病友设计的**指标管理与健康监测工具**。本应用不属于医疗器械，不具任何医疗诊断功能，亦不提供任何医疗建议。应用内所有内容（含百科、建议等）仅供参考，任何医疗决策均须咨询专业医师。

甲友乐旨在帮助用户更科学地管理历史指标、记录用药情况，通过可视化的趋势掌握健康状态，是您甲状腺健康管理的贴心助手。

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
    ├── middlewares/     # 中关件
    ├── routes/          # 路由
    ├── utils/           # 工具类
    └── package.json
```

## 📸 界面预览

*(此处可插入新版 UI 截图：如沉浸式登录、平滑趋势图、智能指标录入等)*

## 功能特性

- 🩺 **指标管理 (非诊断)**：支持 TSH、FT3、FT4、TGAb 等完整指标录入，不仅是记录，更是档案。
- 📸 **智能 OCR 识别**：拍照化验单即可自动提取数据，告别繁琐手动录入（识别结果请以原单为准）。
- 📊 **指标趋势监测**：可视化折线图展示病程变化，辅助病友回顾近期健康波动。
- ⏰ **科学用药提醒**：专为优甲乐设计的空腹服药提醒，支持剂量管理与体感记录。
- 📚 **甲功百科交流**：汇集病友高频问题，提供基于健康共识的科学科普与饮食建议。
- 📱 **跨平台体验**：基于 uni-app 打造，全站采用现代视觉重构，支持 H5、小程序及 App。

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
