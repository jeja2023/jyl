'use strict';

/** SymptomAssessment 模型迁移脚本 & User 缺失字段补偿 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. 创建 SymptomAssessments 表
    await queryInterface.createTable('SymptomAssessments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '主键ID'
      },
      totalScore: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '综合评分'
      },
      resultLevel: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: '结果等级: normal, mild, moderate, severe'
      },
      activityStatus: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '活跃度状态: 倾向性描述'
      },
      hyperScore: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '甲亢倾向得分'
      },
      hypoScore: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '甲减倾向得分'
      },
      categoryScores: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '各维度评分详情 (JSON 字符串)'
      },
      answers: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: '原始答题详情 (JSON 字符串)'
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '关联用户ID'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 2. 补偿 Users 表缺失字段 (lastLoginAt, wikiReadCount)
    const userTable = await queryInterface.describeTable('Users');
    if (!userTable.lastLoginAt) {
      await queryInterface.addColumn('Users', 'lastLoginAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '最后登录时间'
      });
    }
    if (!userTable.wikiReadCount) {
      await queryInterface.addColumn('Users', 'wikiReadCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '百科阅读数'
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SymptomAssessments');
    
    const userTable = await queryInterface.describeTable('Users');
    if (userTable.lastLoginAt) {
      await queryInterface.removeColumn('Users', 'lastLoginAt');
    }
    if (userTable.wikiReadCount) {
      await queryInterface.removeColumn('Users', 'wikiReadCount');
    }
  }
};
