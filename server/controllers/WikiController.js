const WikiArticle = require('../models/WikiArticle');
const User = require('../models/User');
const Response = require('../utils/response');
const { Op } = require('sequelize');
const xss = require('xss');

class WikiController {
    /**
     * 获取已发布文章列表（公开）
     * GET /api/wiki/list
     */
    static async list(ctx) {
        const { category, page = 1, pageSize = 20, keyword } = ctx.query;

        const where = { status: 'published' };
        if (category && category !== '全部') {
            where.category = category;
        }
        if (keyword) {
            where[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { summary: { [Op.like]: `%${keyword}%` } }
            ];
        }

        const { count, rows } = await WikiArticle.findAndCountAll({
            where,
            order: [['isTop', 'DESC'], ['sortOrder', 'DESC'], ['createdAt', 'DESC']],
            offset: (page - 1) * pageSize,
            limit: parseInt(pageSize),
            attributes: ['id', 'title', 'summary', 'category', 'cover', 'views', 'isTop', 'authorName', 'createdAt']
        });

        Response.success(ctx, {
            list: rows,
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });
    }

    /**
     * 获取文章详情（公开）
     * GET /api/wiki/:id
     */
    static async detail(ctx) {
        const { id } = ctx.params;

        const article = await WikiArticle.findByPk(id);
        if (!article) {
            return Response.error(ctx, '文章不存在', 404);
        }

        // 只有已发布的文章才能公开查看
        if (article.status !== 'published') {
            // 检查是否是作者本人或管理员
            const userId = ctx.state.user?.id;
            const userRole = ctx.state.user?.role;
            if (article.authorId !== userId && userRole !== 'admin') {
                return Response.error(ctx, '文章不存在', 404);
            }
        }

        // 增加文章总阅读量
        await article.increment('views');

        // 如果用户已登录，增加用户的个人阅读统计
        if (ctx.state.user?.id) {
            await User.increment('wikiReadCount', {
                where: { id: ctx.state.user.id }
            });
        }

        Response.success(ctx, article);
    }

    /**
     * 用户投稿文章
     * POST /api/wiki/submit
     */
    static async submit(ctx) {
        const { title, summary, content, category, cover } = ctx.request.body;
        const user = ctx.state.user;

        if (!title || !title.trim()) {
            return Response.error(ctx, '文章标题不能为空');
        }
        if (!content || !content.trim()) {
            return Response.error(ctx, '文章内容不能为空');
        }

        // 获取用户昵称
        const userInfo = await User.findByPk(user.id, {
            attributes: ['nickname', 'phone']
        });

        const article = await WikiArticle.create({
            title: title.trim(),
            summary: summary || title.substring(0, 100),
            content: xss(content), // XSS 过滤
            category: category || '疾病知识',
            cover,
            status: 'pending', // 用户投稿默认待审核
            authorId: user.id,
            authorName: userInfo?.nickname || `甲友${userInfo?.phone?.slice(-4) || user.id}`
        });

        Response.success(ctx, { id: article.id }, '投稿成功，等待审核');
    }

    /**
     * 获取我的投稿列表
     * GET /api/wiki/mine
     */
    static async myArticles(ctx) {
        const userId = ctx.state.user.id;
        const { status, page = 1, pageSize = 20 } = ctx.query;

        const where = { authorId: userId };
        if (status) {
            where.status = status;
        }

        const { count, rows } = await WikiArticle.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            offset: (page - 1) * pageSize,
            limit: parseInt(pageSize),
            attributes: ['id', 'title', 'summary', 'category', 'cover', 'views', 'status', 'rejectReason', 'createdAt', 'updatedAt']
        });

        Response.success(ctx, {
            list: rows,
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });
    }

    /**
     * 修改我的投稿（仅限待审核或被拒绝状态）
     * POST /api/wiki/edit
     */
    static async editMyArticle(ctx) {
        const { id, title, summary, content, category, cover } = ctx.request.body;
        const userId = ctx.state.user.id;

        if (!id) {
            return Response.error(ctx, '文章ID不能为空');
        }

        const article = await WikiArticle.findByPk(id);
        if (!article) {
            return Response.error(ctx, '文章不存在', 404);
        }

        // 只能编辑自己的文章
        if (article.authorId !== userId) {
            return Response.error(ctx, '无权编辑此文章', 403);
        }

        // 只能编辑待审核或被拒绝的文章
        if (!['pending', 'rejected', 'draft'].includes(article.status)) {
            return Response.error(ctx, '已发布的文章不能编辑');
        }

        await article.update({
            title: title !== undefined ? title.trim() : article.title,
            summary: summary !== undefined ? summary : article.summary,
            content: content !== undefined ? xss(content) : article.content, // XSS 过滤
            category: category !== undefined ? category : article.category,
            cover: cover !== undefined ? cover : article.cover,
            status: 'pending', // 重新提交后变为待审核
            rejectReason: null // 清空拒绝原因
        });

        Response.success(ctx, article, '修改成功，等待审核');
    }

    /**
     * 删除我的投稿
     * POST /api/wiki/remove
     */
    static async removeMyArticle(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;

        if (!id) {
            return Response.error(ctx, '文章ID不能为空');
        }

        const article = await WikiArticle.findByPk(id);
        if (!article) {
            return Response.error(ctx, '文章不存在', 404);
        }

        // 只能删除自己的文章
        if (article.authorId !== userId) {
            return Response.error(ctx, '无权删除此文章', 403);
        }

        await article.destroy();

        Response.success(ctx, null, '删除成功');
    }

    // ==================== 管理员审核接口 ====================

    /**
     * 获取待审核文章列表（管理员）
     * GET /api/wiki/pending
     */
    static async pendingList(ctx) {
        const { page = 1, pageSize = 20 } = ctx.query;

        const { count, rows } = await WikiArticle.findAndCountAll({
            where: { status: 'pending' },
            order: [['createdAt', 'ASC']], // 先提交的先审核
            offset: (page - 1) * pageSize,
            limit: parseInt(pageSize),
            attributes: ['id', 'title', 'summary', 'category', 'cover', 'authorId', 'authorName', 'createdAt']
        });

        Response.success(ctx, {
            list: rows,
            total: count,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });
    }

    /**
     * 审核通过
     * POST /api/wiki/approve
     */
    static async approve(ctx) {
        const { id } = ctx.request.body;

        if (!id) {
            return Response.error(ctx, '文章ID不能为空');
        }

        const article = await WikiArticle.findByPk(id);
        if (!article) {
            return Response.error(ctx, '文章不存在', 404);
        }

        if (article.status !== 'pending') {
            return Response.error(ctx, '该文章不在待审核状态');
        }

        await article.update({
            status: 'published',
            rejectReason: null
        });

        Response.success(ctx, null, '审核通过');
    }

    /**
     * 审核拒绝
     * POST /api/wiki/reject
     */
    static async reject(ctx) {
        const { id, reason } = ctx.request.body;

        if (!id) {
            return Response.error(ctx, '文章ID不能为空');
        }
        if (!reason) {
            return Response.error(ctx, '请填写拒绝原因');
        }

        const article = await WikiArticle.findByPk(id);
        if (!article) {
            return Response.error(ctx, '文章不存在', 404);
        }

        if (article.status !== 'pending') {
            return Response.error(ctx, '该文章不在待审核状态');
        }

        await article.update({
            status: 'rejected',
            rejectReason: reason
        });

        Response.success(ctx, null, '已拒绝');
    }

    /**
     * 管理员直接发布文章（无需审核）
     * POST /api/wiki/create
     */
    static async create(ctx) {
        const { title, summary, content, category, cover, status, isTop } = ctx.request.body;
        const user = ctx.state.user;

        if (!title) {
            return Response.error(ctx, '文章标题不能为空');
        }

        // 获取用户昵称
        const userInfo = await User.findByPk(user.id, {
            attributes: ['nickname', 'phone']
        });

        const article = await WikiArticle.create({
            title,
            summary,
            content: content ? xss(content) : content,
            category: category || '疾病知识',
            cover,
            status: status || 'published', // 管理员发布默认直接发布
            isTop: isTop || false,
            authorId: user.id,
            authorName: userInfo?.nickname || '管理员'
        });

        Response.success(ctx, article, '发布成功');
    }

    /**
     * 管理员更新文章
     * POST /api/wiki/update
     */
    static async update(ctx) {
        const { id, title, summary, content, category, cover, status, isTop, sortOrder } = ctx.request.body;

        if (!id) {
            return Response.error(ctx, '文章ID不能为空');
        }

        const article = await WikiArticle.findByPk(id);
        if (!article) {
            return Response.error(ctx, '文章不存在', 404);
        }

        await article.update({
            title: title !== undefined ? title : article.title,
            summary: summary !== undefined ? summary : article.summary,
            content: content !== undefined ? xss(content) : article.content,
            category: category !== undefined ? category : article.category,
            cover: cover !== undefined ? cover : article.cover,
            status: status !== undefined ? status : article.status,
            isTop: isTop !== undefined ? isTop : article.isTop,
            sortOrder: sortOrder !== undefined ? sortOrder : article.sortOrder
        });

        Response.success(ctx, article, '更新成功');
    }

    /**
     * 管理员删除文章
     * POST /api/wiki/delete
     */
    static async delete(ctx) {
        const { id } = ctx.request.body;

        if (!id) {
            return Response.error(ctx, '文章ID不能为空');
        }

        const article = await WikiArticle.findByPk(id);
        if (!article) {
            return Response.error(ctx, '文章不存在', 404);
        }

        await article.destroy();

        Response.success(ctx, null, '删除成功');
    }

    /**
     * 初始化默认文章数据
     * POST /api/wiki/init
     */
    static async initData(ctx) {
        const count = await WikiArticle.count();
        if (count > 0) {
            return Response.success(ctx, { count }, '数据已存在，无需初始化');
        }

        // 预置文章数据
        const defaultArticles = [
            {
                title: '甲状腺功能减退症的症状与治疗',
                summary: '了解甲减的常见症状、诊断方法和治疗方案',
                category: '疾病知识',
                cover: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400',
                views: 3256,
                status: 'published',
                authorName: '甲友百科',
                content: '<h3>什么是甲状腺功能减退症？</h3><p>甲状腺功能减退症（简称甲减）是由于甲状腺激素分泌不足导致的内分泌疾病。</p><h3>常见症状</h3><ul><li>疲劳乏力、嗜睡</li><li>怕冷、皮肤干燥</li><li>体重增加</li><li>便秘</li><li>记忆力下降</li></ul>'
            },
            {
                title: '优甲乐的正确服用方法',
                summary: '掌握左甲状腺素钠片的服用技巧和注意事项',
                category: '用药指南',
                cover: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
                views: 5621,
                status: 'published',
                authorName: '甲友百科',
                content: '<h3>服药时间</h3><p>建议早晨空腹服用，服药后30-60分钟内避免进食。</p><h3>注意事项</h3><ul><li>避免与钙剂、铁剂同服</li><li>避免与豆浆、牛奶同服</li><li>不可自行调整剂量</li></ul>'
            },
            {
                title: '甲状腺患者的饮食建议',
                summary: '科学饮食帮助维护甲状腺健康',
                category: '饮食调理',
                cover: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
                views: 4532,
                status: 'published',
                authorName: '甲友百科',
                content: '<h3>碘的摄入</h3><p>甲减患者通常可正常摄入碘盐，但甲亢患者需要限制碘摄入。</p><h3>推荐食物</h3><ul><li>富含硒的食物</li><li>优质蛋白</li><li>新鲜蔬果</li></ul>'
            },
            {
                title: '如何看懂甲功报告单',
                summary: '详解TSH、FT3、FT4等指标的含义',
                category: '检查解读',
                cover: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400',
                views: 6789,
                status: 'published',
                authorName: '甲友百科',
                content: '<h3>核心指标说明</h3><h4>TSH（促甲状腺激素）</h4><p>正常范围：0.27-4.2 mIU/L</p><p>TSH升高提示甲减，降低提示甲亢。</p><h4>FT4（游离甲状腺素）</h4><p>正常范围：12-22 pmol/L</p>'
            }
        ];

        await WikiArticle.bulkCreate(defaultArticles);

        Response.success(ctx, { count: defaultArticles.length }, '初始化成功');
    }
}

module.exports = WikiController;
