const sequelize = require('./db');
const WikiArticle = require('./models/WikiArticle');

const baseContent = `
    <h3>摘要</h3>
    <p>这是一个关于甲状腺健康的详细科普文章。这里包含了症状、原因、诊断和治疗方案的全面介绍。</p>
    <h3>核心观点</h3>
    <ul>
        <li><strong>早发现早治疗：</strong> 定期体检是关键。</li>
        <li><strong>遵医嘱用药：</strong> 不要随意停药或更改剂量。</li>
        <li><strong>保持良好心态：</strong> 情绪对内分泌影响巨大。</li>
    </ul>
    <h3>详细建议</h3>
    <p>建议患者保持规律的作息，均衡饮食，并根据医生的指导进行适量的运动。</p>
`;

const articles = [
    // === 1. 疾病知识 ===
    {
        title: '甲状腺功能减退（甲减）全攻略',
        summary: '甲减是甲状腺激素分泌不足导致的全身性低代谢综合征。本文详解症状、诊断与治疗。',
        category: '疾病知识',
        cover: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
        authorName: '甲友医生',
        views: 1250,
        status: 'published',
        content: baseContent
    },
    {
        title: '分化型甲状腺癌是什么？严重吗？',
        summary: '大多数甲状腺癌被称为“懒癌”，预后良好。带你了解最常见的乳头状癌。',
        category: '疾病知识',
        cover: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
        authorName: '肿瘤科张主任',
        views: 3102,
        status: 'published',
        content: baseContent
    },
    {
        title: '桥本氏甲状腺炎：你需要知道的一切',
        summary: '这是一种自身免疫性疾病。TPOAb抗体高是怎么回事？会对身体有什么影响？',
        category: '疾病知识',
        cover: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80',
        authorName: '内分泌李医生',
        views: 2800,
        status: 'published',
        content: baseContent
    },
    {
        title: '甲亢突眼怎么办？日常护理要点',
        summary: '甲状腺相关眼病（TAO）让很多患者苦恼。如何保护眼睛？什么时候需要激素治疗？',
        category: '疾病知识',
        cover: 'https://images.unsplash.com/photo-1505672671508-cf7cf80a8276?auto=format&fit=crop&w=800&q=80', // Eyes
        authorName: '眼科专家',
        views: 1560,
        status: 'published',
        content: baseContent
    },
    {
        title: '甲状腺结节会癌变吗？',
        summary: '发现结节不要慌，绝大多数都是良性的。哪些征兆提示恶性风险？',
        category: '疾病知识',
        cover: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80',
        authorName: '科普君',
        views: 4200,
        status: 'published',
        content: baseContent
    },

    // === 2. 用药指南 ===
    {
        title: '优甲乐（左甲状腺素钠）服用完全指南',
        summary: '优甲乐是治疗甲减和甲癌术后TSH抑制治疗的常用药。如何正确服用？漏服怎么办？',
        category: '用药指南',
        cover: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
        authorName: '药师小王',
        views: 3420,
        status: 'published',
        content: baseContent
    },
    {
        title: '钙片和维生素D，术后患者怎么补？',
        summary: '甲状腺全切术后容易出现低钙血症，手脚麻木。科学补钙很重要。',
        category: '用药指南',
        cover: 'https://images.unsplash.com/photo-1550572017-4fcd95638d93?auto=format&fit=crop&w=800&q=80',
        authorName: '营养科刘医生',
        views: 1540,
        status: 'published',
        content: baseContent
    },
    {
        title: '漏服优甲乐，第二天要不要双倍补？',
        summary: '偶尔漏服一次问题不大，但如果经常漏服会影响TSH指标。补服规则详解。',
        category: '用药指南',
        cover: 'https://images.unsplash.com/photo-1623838423223-96e00ea01d2a?auto=format&fit=crop&w=800&q=80',
        authorName: '药师小王',
        views: 1890,
        status: 'published',
        content: baseContent
    },
    {
        title: '甲流/感冒期间，优甲乐还能吃吗？',
        summary: '生病期间能不能停药？感冒药和优甲乐会冲突吗？',
        category: '用药指南',
        cover: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80',
        authorName: '全科医生',
        views: 2100,
        status: 'published',
        content: baseContent
    },
    {
        title: '长期服用优甲乐的副作用及应对',
        summary: '骨质疏松？心慌失眠？长期用药的朋友需要关注这些潜在风险。',
        category: '用药指南',
        cover: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80',
        authorName: '内分泌科陈医生',
        views: 3300,
        status: 'published',
        content: baseContent
    },

    // === 3. 饮食调理 ===
    {
        title: '碘131治疗前的低碘饮食攻略',
        summary: '即将进行碘131治疗？这篇低碘饮食红黑榜请收好！',
        category: '饮食调理',
        cover: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
        authorName: '营养师',
        views: 890,
        status: 'published',
        content: baseContent
    },
    {
        title: '十字花科蔬菜真的不能吃吗？',
        summary: '西兰花、卷心菜会导致甲状腺肿？抛开剂量谈毒性都是耍流氓。',
        category: '饮食调理',
        cover: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
        authorName: '科普君',
        views: 2200,
        status: 'published',
        content: baseContent
    },
    {
        title: '海鲜解禁指南：哪些能吃哪些不能吃',
        summary: '对于大部分甲癌术后患者，并不需要终身忌碘。海鱼、带鱼其实是可以吃的。',
        category: '饮食调理',
        cover: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?auto=format&fit=crop&w=800&q=80', // Seafood
        authorName: '美食家',
        views: 4100,
        status: 'published',
        content: baseContent
    },
    {
        title: '甲亢患者饮食黑名单',
        summary: '甲亢患者不仅要忌碘，还要注意高代谢带来的营养消耗。这些食物千万别碰。',
        category: '饮食调理',
        cover: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=800&q=80',
        authorName: '营养师小张',
        views: 1600,
        status: 'published',
        content: baseContent
    },
    {
        title: '术后身体虚弱，吃什么恢复快？',
        summary: '高蛋白饮食有助于伤口愈合。推荐几款适合术后恢复的营养食谱。',
        category: '饮食调理',
        cover: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=800&q=80',
        authorName: '中华小当家',
        views: 2900,
        status: 'published',
        content: baseContent
    },

    // === 4. 生活方式 ===
    {
        title: '保持甲状腺健康的5个生活习惯',
        summary: '熬夜、情绪波动是大忌。如何通过改变生活习惯养护甲状腺？',
        category: '生活方式',
        cover: 'https://images.unsplash.com/photo-1544367563-12123d8965cd?auto=format&fit=crop&w=800&q=80',
        authorName: '健康管家',
        views: 560,
        status: 'published',
        content: baseContent
    },
    {
        title: '甲亢患者运动指南',
        summary: '甲亢期间能运动吗？心率快怎么办？这里有针对性的建议。',
        category: '生活方式',
        cover: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
        authorName: '康复师',
        views: 330,
        status: 'published',
        content: baseContent
    },
    {
        title: '备孕期间发现了甲减怎么办？',
        summary: 'TSH水平直接影响胎儿智力发育。孕前、孕早期如何调整药量？',
        category: '生活方式',
        cover: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80', // Pregnant
        authorName: '妇产科医生',
        views: 1800,
        status: 'published',
        content: baseContent
    },
    {
        title: '熬夜对甲状腺的伤害有多大？',
        summary: '别再熬夜了！长期睡眠不足会扰乱内分泌，加重甲状腺负担。',
        category: '生活方式',
        cover: 'https://images.unsplash.com/photo-1526493632906-8b9399432f91?auto=format&fit=crop&w=800&q=80', // Sleep
        authorName: '健康达人',
        views: 2200,
        status: 'published',
        content: baseContent
    },
    {
        title: '术后疤痕护理：如何让脖子更美观',
        summary: '疤痕增生期怎么护理？减张贴怎么贴？推荐几款好用的祛疤膏。',
        category: '生活方式',
        cover: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80', // Neck/Beauty
        authorName: '美妆博主',
        views: 5500,
        status: 'published',
        content: baseContent
    },

    // === 5. 检查解读 ===
    {
        title: '甲状腺结节TI-RADS分级详解',
        summary: '体检报告上的TI-RADS 3类、4a类是什么意思？需要手术吗？',
        category: '检查解读',
        cover: 'https://images.unsplash.com/photo-1559757602-cc27ad6aab13?auto=format&fit=crop&w=800&q=80',
        authorName: '放射科李医生',
        views: 2100,
        status: 'published',
        content: baseContent
    },
    {
        title: '教你看懂甲功五项报告单',
        summary: 'TSH、FT3、FT4箭头向上向下分别代表什么？一分钟学会看报告。',
        category: '检查解读',
        cover: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80',
        authorName: '内分泌科陈医生',
        views: 4500,
        status: 'published',
        content: baseContent
    },
    {
        title: '甲球蛋白（Tg）升高就是复发吗？',
        summary: 'Tg是术后监测复发的重要指标，但TgAb抗体也会干扰检测结果。',
        category: '检查解读',
        cover: 'https://images.unsplash.com/photo-1579911098650-a8d855734bd4?auto=format&fit=crop&w=800&q=80', // Lab
        authorName: '检验科王主任',
        views: 1900,
        status: 'published',
        content: baseContent
    },
    {
        title: '颈部淋巴结肿大：是炎症还是转移？',
        summary: 'B超报告上写着“淋巴结肿大”、“皮髓质分界不清”该如何解读？',
        category: '检查解读',
        cover: 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?auto=format&fit=crop&w=800&q=80',
        authorName: '超声科刘医生',
        views: 2300,
        status: 'published',
        content: baseContent
    },
    {
        title: '穿刺活检（FNA）痛不痛？全过程揭秘',
        summary: '细针穿刺是术前确诊的金标准。很多患者因恐惧不敢做，其实并不疼。',
        category: '检查解读',
        cover: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80', // Needle
        authorName: '外科张医生',
        views: 3100,
        status: 'published',
        content: baseContent
    },

    // === 6. 经验分享 ===
    {
        title: '我的甲癌术后五年康复之路',
        summary: '从确诊时的崩溃到现在的坦然，一位五年“甲友”的心路历程。',
        category: '经验分享',
        cover: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
        authorName: '乐观的向日葵',
        views: 5600,
        status: 'published',
        content: baseContent
    },
    {
        title: '碘131隔离期间我是怎么度过的',
        summary: '一个人在隔离病房的3天，其实也可以很有趣。带什么东西进去最实用？',
        category: '经验分享',
        cover: 'https://images.unsplash.com/photo-1512418490979-59295d48651c?auto=format&fit=crop&w=800&q=80',
        authorName: '小强',
        views: 1200,
        status: 'published',
        content: baseContent
    },
    {
        title: '二胎妈妈的抗癌日记',
        summary: '怀孕期间发现结节，产后确诊。为了孩子，我必须坚强。',
        category: '经验分享',
        cover: 'https://images.unsplash.com/photo-1530263503223-99933068dc6d?auto=format&fit=crop&w=800&q=80', // Mother
        authorName: '坚强的妈妈',
        views: 4500,
        status: 'published',
        content: baseContent
    },
    {
        title: '从焦虑到释怀：心理调适指南',
        summary: '生病后总是胡思乱想，担心复发。如何走出心理阴影，重建生活信心？',
        category: '经验分享',
        cover: 'https://images.unsplash.com/photo-1474418397713-7ede21d49118?auto=format&fit=crop&w=800&q=80', // Peace
        authorName: '心理咨询师',
        views: 2800,
        status: 'published',
        content: baseContent
    },
    {
        title: '重返职场：术后如何调整工作节奏',
        summary: '不需要辞职！只要身体允许，这里有几条职场生存建议送给你。',
        category: '经验分享',
        cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', // Office
        authorName: '职场达人',
        views: 1600,
        status: 'published',
        content: baseContent
    }
];

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 清空现有数据
        await WikiArticle.destroy({ where: {}, truncate: true });
        console.log('Old articles cleared.');

        // 插入新数据
        await WikiArticle.bulkCreate(articles);
        console.log(`Successfully created ${articles.length} rich articles with covers.`);

    } catch (e) {
        console.error('Error seeding data:', e);
    } finally {
        process.exit();
    }
})();
