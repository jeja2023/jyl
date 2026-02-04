const sequelize = require('./db');
const WikiArticle = require('./models/WikiArticle');

const categoryImages = {
    '疾病知识': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
    '用药指南': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    '饮食调理': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80',
    '生活方式': 'https://images.unsplash.com/photo-1544367563-12123d8965cd?auto=format&fit=crop&w=400&q=80',
    '检查解读': 'https://images.unsplash.com/photo-1559757602-cc27ad6aab13?auto=format&fit=crop&w=400&q=80',
    '经验分享': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'
};

const defaultImage = 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80';

(async () => {
    try {
        await sequelize.authenticate();
        const articles = await WikiArticle.findAll();
        console.log(`Checking ${articles.length} articles...`);

        let fixedCount = 0;
        for (const article of articles) {
            if (!article.cover || article.cover === '' || article.cover.includes('placehold.co')) {
                const newCover = categoryImages[article.category] || defaultImage;
                article.cover = newCover;
                await article.save();
                fixedCount++;
            }
        }

        console.log(`Success! Fixed ${fixedCount} articles with missing or placeholder covers.`);
    } catch (e) {
        console.error('Error fixing data:', e);
    } finally {
        process.exit();
    }
})();
