const { Op } = require('sequelize');
const HealthRecord = require('../models/HealthRecord');
const FamilyMember = require('../models/FamilyMember');
const Response = require('../utils/response');
const { logAction } = require('../utils/actionLog');
const ExcelJS = require('exceljs');
const { DEFAULT_RANGES, TREND_KEYS } = require('../utils/indicatorAnalysis');
const logger = require('../utils/logger');
const { getPagination } = require('../utils/pagination');

const LAB_KEYS = Object.keys(DEFAULT_RANGES);

class RecordController {
    static cleanData(data) {
        for (const key in data) {
            if (data[key] === '') data[key] = null;
        }
    }

    static async export(ctx) {
        const userId = ctx.state.user.id;
        const { id, memberId } = ctx.query;

        const where = { UserId: userId };
        if (id) where.id = id;
        if (memberId) where.memberId = memberId;

        const records = await HealthRecord.findAll({
            where,
            include: [{ model: FamilyMember, attributes: ['name'] }],
            order: [['recordDate', 'DESC']]
        });

        logger.debug('Export records query completed', { userId, count: records?.length || 0 });
        if (!records || records.length === 0) {
            logger.warn('Export stopped: no records found', { userId });
            return Response.error(ctx, '无记录可导出');
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('健康指标记录');

        sheet.columns = [
            { header: '日期', key: 'recordDate', width: 15 },
            { header: '所属成员', key: 'memberName', width: 12 },
            ...LAB_KEYS.map(key => {
                const range = DEFAULT_RANGES[key] || {};
                return { header: `${key}${range.unit ? ` (${range.unit})` : ''}`, key, width: 14 };
            }),
            { header: '体重 (kg)', key: 'weight', width: 10 },
            { header: '心率 (bpm)', key: 'heartRate', width: 10 },
            { header: '超声提示/备注', key: 'feeling', width: 30 }
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE9E9E9' }
        };

        records.forEach(item => {
            sheet.addRow({
                recordDate: item.recordDate,
                memberName: item.FamilyMember ? item.FamilyMember.name : '本人',
                ...LAB_KEYS.reduce((acc, key) => {
                    acc[key] = item[key];
                    return acc;
                }, {}),
                weight: item.weight,
                heartRate: item.heartRate,
                feeling: [item.ultrasoundNote, item.conclusion, item.feeling].filter(Boolean).join(' ')
            });
        });

        sheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        const filename = `Health_Records_${Date.now()}.xlsx`;
        ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        ctx.set('Content-Disposition', `attachment; filename=${filename}`);

        const buffer = await workbook.xlsx.writeBuffer();
        logger.info('Export Excel generated', { userId, bytes: buffer.length });
        ctx.body = buffer;
        logAction(ctx, '导出数据', '健康记录', `用户导出了${records.length}条记录`);
    }

    static async import(ctx) {
        const userId = ctx.state.user.id;
        const { fileData } = ctx.request.body;
        if (!fileData) return Response.error(ctx, '未接收到文件数据');

        try {
            const base64Data = fileData.replace(/^data:.*base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const sheet = workbook.getWorksheet(1);
            if (!sheet) return Response.error(ctx, 'Excel 格式错误：未找到工作表');

            const headerRow = sheet.getRow(1);
            const colMap = {};
            const fieldAliases = {
                recordDate: ['日期', '化验日期', '检查日期', 'date'],
                TSH: ['TSH', '促甲状腺激素'],
                FT3: ['FT3', '游离三碘甲状腺原氨酸', '游离三碘'],
                FT4: ['FT4', '游离甲状腺素'],
                T3: ['T3', '三碘甲状腺原氨酸'],
                T4: ['T4', '总甲状腺素', '甲状腺素'],
                TPOAb: ['TPOAb', 'TPO-Ab', '抗甲状腺过氧化物酶抗体'],
                TGAb: ['TGAb', 'TG-Ab', '抗甲状腺球蛋白抗体'],
                TRAb: ['TRAb', '促甲状腺激素受体抗体'],
                Tg: ['Tg', '甲状腺球蛋白'],
                Calcitonin: ['降钙素', 'CT'],
                Calcium: ['血钙', 'Calcium', '钙'],
                Magnesium: ['血镁', 'Magnesium', 'Mg', '镁'],
                Phosphorus: ['血磷', 'Phosphorus', 'P', '磷'],
                PTH: ['PTH', '甲状旁腺激素'],
                TSI: ['TSI', '甲状腺刺激免疫球蛋白'],
                TBAb: ['TBAb', '促甲状腺素受体阻断抗体'],
                CEA: ['CEA', '癌胚抗原'],
                VitaminD: ['VitaminD', '25-OH-D', '25羟维生素D', '维生素D'],
                Albumin: ['Albumin', 'Alb', '白蛋白'],
                ALP: ['ALP', '碱性磷酸酶'],
                ALT: ['ALT', '丙氨酸氨基转移酶'],
                AST: ['AST', '天门冬氨酸氨基转移酶'],
                GGT: ['GGT', '谷氨酰转肽酶'],
                Bilirubin: ['Bilirubin', '总胆红素', 'TBil'],
                WBC: ['WBC', '白细胞'],
                Neutrophils: ['Neutrophils', 'NEUT', '中性粒细胞', '中性粒'],
                TC: ['TC', '总胆固醇'],
                LDL: ['LDL', 'LDL-C', '低密度脂蛋白'],
                HDL: ['HDL', 'HDL-C', '高密度脂蛋白'],
                Triglyceride: ['Triglyceride', 'TG', '甘油三酯'],
                CK: ['CK', '肌酸激酶'],
                ESR: ['ESR', '红细胞沉降率', '血沉'],
                CRP: ['CRP', 'C反应蛋白'],
                weight: ['体重', 'weight'],
                heartRate: ['心率', 'heartRate', '心跳'],
                feeling: ['备注', 'feeling', '说明', '超声提示/备注'],
                memberName: ['成员', '姓名', '所属成员', 'name']
            };

            headerRow.eachCell((cell, colNumber) => {
                const headerText = cell.text.trim();
                for (const field in fieldAliases) {
                    if (fieldAliases[field].includes(headerText) || headerText.includes(field)) {
                        colMap[field] = colNumber;
                    }
                }
            });

            if (!colMap.recordDate) return Response.error(ctx, '导入失败：Excel 中必须包含“日期”列');

            const importRecords = [];
            let skipCount = 0;
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                const dateVal = row.getCell(colMap.recordDate).value;
                if (!dateVal) return;

                const recordDate = dateVal instanceof Date
                    ? dateVal.toISOString().split('T')[0]
                    : String(dateVal).trim();
                const rowData = { UserId: userId, recordDate };

                if (colMap.memberName) {
                    const memberName = row.getCell(colMap.memberName).value;
                    if (memberName && memberName !== '本人') {
                        rowData._tempMemberName = String(memberName).trim();
                    }
                }

                for (const field in colMap) {
                    if (field === 'recordDate' || field === 'memberName') continue;
                    const val = row.getCell(colMap[field]).value;
                    rowData[field] = val !== null && val !== undefined ? String(val).trim() : null;
                }

                importRecords.push(rowData);
            });

            if (importRecords.length === 0) return Response.error(ctx, '未在 Excel 中找到有效数据');

            const members = await FamilyMember.findAll({ where: { UserId: userId } });
            const memberMap = {};
            members.forEach(member => {
                memberMap[member.name] = member.id;
            });

            let successCount = 0;
            for (const item of importRecords) {
                try {
                    if (item._tempMemberName && memberMap[item._tempMemberName]) {
                        item.memberId = memberMap[item._tempMemberName];
                    }
                    delete item._tempMemberName;

                    const existing = await HealthRecord.findOne({
                        where: {
                            UserId: userId,
                            recordDate: item.recordDate,
                            memberId: item.memberId || null
                        }
                    });

                    if (existing) await existing.update(item);
                    else await HealthRecord.create(item);
                    successCount++;
                } catch (e) {
                    logger.warn('Import row failed', { message: e.message });
                    skipCount++;
                }
            }

            Response.success(ctx, { successCount, skipCount }, `成功导入 ${successCount} 条记录${skipCount > 0 ? `，跳过 ${skipCount} 条` : ''}`);
            logAction(ctx, '导入数据', '健康记录', `用户导入了${successCount}条记录`);
        } catch (error) {
            logger.error('Import failed', { message: error.message });
            Response.error(ctx, '解析 Excel 文件失败');
        }
    }

    static async create(ctx) {
        const data = ctx.request.body;
        const userId = ctx.state.user.id;
        RecordController.cleanData(data);

        if (!data.recordDate) return Response.error(ctx, '缺少报告日期');
        if (data.memberId) {
            const member = await FamilyMember.findOne({ where: { id: data.memberId, UserId: userId } });
            if (!member) return Response.error(ctx, '家庭成员不存在', 400);
        }

        if ((data.thyroidLeft || data.noduleCount || data.ultrasoundNote) && !data.ultrasoundDate) {
            data.ultrasoundDate = data.recordDate;
        }

        const record = await HealthRecord.create({ ...data, UserId: userId });
        Response.success(ctx, record, '健康记录已保存');
        logAction(ctx, '新增记录', '健康记录', `用户新增了日期为 ${data.recordDate} 的检查记录`);
    }

    static async list(ctx) {
        const userId = ctx.state.user.id;
        const { hasLab } = ctx.query;
        const { limit, offset } = getPagination(ctx.query, { defaultPageSize: 20, maxPageSize: 100 });

        const where = { UserId: userId };
        if (hasLab == 1) {
            where[Op.or] = LAB_KEYS.map(key => ({ [key]: { [Op.ne]: null } }));
        }

        const { count, rows } = await HealthRecord.findAndCountAll({
            where,
            include: [{ model: FamilyMember, attributes: ['id', 'name', 'relation', 'patientType'] }],
            order: [['recordDate', 'DESC']],
            limit,
            offset
        });

        const list = rows.map(item => {
            const row = item.toJSON();
            row.reportImage = RecordController.parseImages(row.reportImage);
            row.ultrasoundImage = RecordController.parseImages(row.ultrasoundImage);
            row.indicatorUnits = RecordController.parseJson(row.indicatorUnits) || row.indicatorUnits;
            row.ocrReview = RecordController.parseJson(row.ocrReview) || row.ocrReview;
            return row;
        });

        Response.success(ctx, { total: count, list });
    }

    static async detail(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;
        const record = await HealthRecord.findOne({
            where: { id, UserId: userId },
            include: [{ model: FamilyMember, attributes: ['id', 'name', 'relation', 'patientType'] }]
        });

        if (!record) return Response.error(ctx, '记录不存在', 404);

        const row = record.toJSON();
        row.reportImage = RecordController.parseImages(row.reportImage);
        row.ultrasoundImage = RecordController.parseImages(row.ultrasoundImage);
        row.indicatorUnits = RecordController.parseJson(row.indicatorUnits) || row.indicatorUnits;
        row.ocrReview = RecordController.parseJson(row.ocrReview) || row.ocrReview;
        Response.success(ctx, row);
    }

    static async trend(ctx) {
        const userId = ctx.state.user.id;
        const list = await HealthRecord.findAll({
            where: {
                UserId: userId,
                [Op.or]: TREND_KEYS.map(key => ({ [key]: { [Op.ne]: null } }))
            },
            attributes: ['recordDate', ...TREND_KEYS],
            order: [['recordDate', 'DESC']],
            limit: 12
        });
        Response.success(ctx, list.reverse());
    }

    static async update(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;
        const data = ctx.request.body;
        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        RecordController.cleanData(data);
        if (Object.prototype.hasOwnProperty.call(data, 'memberId')) {
            if (data.memberId) {
                const member = await FamilyMember.findOne({ where: { id: data.memberId, UserId: userId } });
                if (!member) return Response.error(ctx, '家庭成员不存在', 400);
            } else {
                data.memberId = null;
            }
        }

        if ((data.thyroidLeft || data.noduleCount || data.ultrasoundNote) && !data.ultrasoundDate) {
            data.ultrasoundDate = data.recordDate || record.recordDate;
        }

        await record.update(data);
        Response.success(ctx, record, '记录已更新');
        logAction(ctx, '更新记录', '健康记录', `用户更新了日期为 ${record.recordDate} 的检查记录`);
    }

    static async delete(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;
        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        await record.destroy();
        Response.success(ctx, null, '记录已删除');
        logAction(ctx, '删除记录', '健康记录', `用户删除了日期为 ${record.recordDate} 的检查记录`);
    }

    static parseImages(val) {
        if (!val) return [];
        let result;
        if (Array.isArray(val)) {
            result = val;
        } else {
            try {
                result = JSON.parse(val);
                if (!Array.isArray(result)) result = [result];
            } catch (e) {
                result = [val];
            }
        }
        return result.map(item => Array.isArray(item) ? item[0] : item).filter(i => i && typeof i === 'string');
    }

    static parseJson(val) {
        if (!val) return null;
        if (typeof val === 'object') return val;
        try {
            return JSON.parse(val);
        } catch (e) {
            return null;
        }
    }
}

module.exports = RecordController;
