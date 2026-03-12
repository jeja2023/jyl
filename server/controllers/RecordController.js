const HealthRecord = require('../models/HealthRecord');
const Response = require('../utils/response');
const { logAction } = require('../utils/actionLog');
const ExcelJS = require('exceljs');

class RecordController {
    // 辅助方法：清洗数据，将空字符串转换为 null
    static cleanData(data) {
        for (const key in data) {
            if (data[key] === '') {
                data[key] = null;
            }
        }
    }

    // 导出数据
    static async export(ctx) {
        const userId = ctx.state.user.id;
        const { id } = ctx.query; // 如果传了 id 则导出单条，否则导出全部

        const where = { UserId: userId };
        if (id) {
            where.id = id;
        }

        const records = await HealthRecord.findAll({
            where,
            order: [['recordDate', 'DESC']]
        });
        
        console.log(`[导出诊断] 用户 ID: ${userId}, 查找到记录数: ${records?.length || 0}`);

        if (!records || records.length === 0) {
            console.warn(`[导出停止] 用户 ID: ${userId} 没有可导出的记录`);
            return Response.error(ctx, '无记录可导出');
        }

        console.log(`[导出执行] 正在开始生成 Excel 文件...`);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('健康指标记录');

        // 定义表头
        const columns = [
            { header: '日期', key: 'recordDate', width: 15 },
            { header: 'TSH (mIU/L)', key: 'TSH', width: 12 },
            { header: 'FT3 (pmol/L)', key: 'FT3', width: 12 },
            { header: 'FT4 (pmol/L)', key: 'FT4', width: 12 },
            { header: 'T3 (nmol/L)', key: 'T3', width: 12 },
            { header: 'T4 (nmol/L)', key: 'T4', width: 12 },
            { header: 'TPOAb (IU/mL)', key: 'TPOAb', width: 12 },
            { header: 'TGAb (IU/mL)', key: 'TGAb', width: 12 },
            { header: 'TRAb (IU/L)', key: 'TRAb', width: 12 },
            { header: 'Tg (ng/mL)', key: 'Tg', width: 12 },
            { header: '降钙素 (pg/mL)', key: 'Calcitonin', width: 12 },
            { header: '血钙 (mmol/L)', key: 'Calcium', width: 10 },
            { header: 'PTH (pg/mL)', key: 'PTH', width: 10 },
            { header: '体重 (kg)', key: 'weight', width: 10 },
            { header: '心率 (bpm)', key: 'heartRate', width: 10 },
            { header: '超声提示/备注', key: 'feeling', width: 30 }
        ];

        sheet.columns = columns;

        // 设置表头样式
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE9E9E9' }
        };

        // 添加数据
        records.forEach(item => {
            const rowData = {
                recordDate: item.recordDate,
                TSH: item.TSH,
                FT3: item.FT3,
                FT4: item.FT4,
                T3: item.T3,
                T4: item.T4,
                TPOAb: item.TPOAb,
                TGAb: item.TGAb,
                TRAb: item.TRAb,
                Tg: item.Tg,
                Calcitonin: item.Calcitonin,
                Calcium: item.Calcium,
                PTH: item.PTH,
                weight: item.weight,
                heartRate: item.heartRate,
                feeling: (item.ultrasoundNote || '') + ' ' + (item.feeling || '')
            };
            sheet.addRow(rowData);
        });

        // 统一单元格样式
        sheet.eachRow((row, rowNumber) => {
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

        // 设置响应头并导出
        const filename = `Health_Records_${new Date().getTime()}.xlsx`;
        ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        ctx.set('Content-Disposition', `attachment; filename=${filename}`);

        const buffer = await workbook.xlsx.writeBuffer();
        console.log(`[导出完成] Excel Buffer 已生成, 大小: ${buffer.length} bytes`);
        ctx.body = buffer;

        logAction(ctx, '导出数据', '健康记录', `用户导出了 ${records.length} 条记录`);
    }

    // 导入数据
    static async import(ctx) {
        const userId = ctx.state.user.id;
        const { fileData } = ctx.request.body;

        if (!fileData) {
            return Response.error(ctx, '未接收到文件数据');
        }

        try {
            // 解析 Base64
            const base64Data = fileData.replace(/^data:.*base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const sheet = workbook.getWorksheet(1);

            if (!sheet) {
                return Response.error(ctx, 'Excel 格式错误：未找到工作表');
            }

            // 获取表头映射
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
                PTH: ['PTH', '甲状旁腺激素'],
                weight: ['体重', 'weight'],
                heartRate: ['心率', 'heartRate', '心跳'],
                feeling: ['备注', 'feeling', '说明', '超声提示/备注']
            };

            headerRow.eachCell((cell, colNumber) => {
                const headerText = cell.text.trim();
                for (const field in fieldAliases) {
                    if (fieldAliases[field].includes(headerText) || headerText.includes(field)) {
                        colMap[field] = colNumber;
                    }
                }
            });

            if (!colMap.recordDate) {
                return Response.error(ctx, '导入失败：Excel 中必须包含“日期”列');
            }

            const importRecords = [];
            let skipCount = 0;

            // 遍历数据行 (从第二行开始)
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;

                const dateVal = row.getCell(colMap.recordDate).value;
                if (!dateVal) return;

                // 处理日期格式
                let recordDate;
                if (dateVal instanceof Date) {
                    recordDate = dateVal.toISOString().split('T')[0];
                } else {
                    recordDate = String(dateVal).trim();
                }

                const rowData = {
                    UserId: userId,
                    recordDate
                };

                // 填充其他字段
                for (const field in colMap) {
                    if (field === 'recordDate') continue;
                    const val = row.getCell(colMap[field]).value;
                    rowData[field] = val !== null && val !== undefined ? String(val).trim() : null;
                }

                importRecords.push(rowData);
            });

            if (importRecords.length === 0) {
                return Response.error(ctx, '未在 Excel 中找到有效数据');
            }

            // 执行保存 (这里使用循环保存，以便触发日期重复逻辑或简单处理)
            // 也可以先批量查重
            let successCount = 0;
            for (const item of importRecords) {
                try {
                    // 检查是否已存在同日期的记录
                    const existing = await HealthRecord.findOne({
                        where: { UserId: userId, recordDate: item.recordDate }
                    });

                    if (existing) {
                        await existing.update(item);
                    } else {
                        await HealthRecord.create(item);
                    }
                    successCount++;
                } catch (e) {
                    console.error('导入行失败:', e);
                    skipCount++;
                }
            }

            Response.success(ctx, { successCount, skipCount }, `成功导入 ${successCount} 条记录${skipCount > 0 ? `，跳过 ${skipCount} 条` : ''}`);
            logAction(ctx, '导入数据', '健康记录', `用户导入了 ${successCount} 条记录`);

        } catch (error) {
            console.error('[导入失败]', error);
            Response.error(ctx, '解析 Excel 文件失败');
        }
    }

    // 新增记录
    static async create(ctx) {
        const data = ctx.request.body;
        const userId = ctx.state.user.id;

        // 数据清洗
        RecordController.cleanData(data);

        // 如果填写了B超数据但没填B超日期，默认使用主日期
        if ((data.thyroidLeft || data.noduleCount || data.ultrasoundNote) && !data.ultrasoundDate) {
            data.ultrasoundDate = data.recordDate;
        }

        const record = await HealthRecord.create({
            ...data,
            UserId: userId
        });

        Response.success(ctx, record, '健康记录已保存');
        logAction(ctx, '新增记录', '健康记录', `用户新增了日期为 ${data.recordDate} 的检查记录`);
    }

    // 获取列表 (按日期倒序)
    static async list(ctx) {
        const userId = ctx.state.user.id;
        const { limit = 20, offset = 0, hasLab } = ctx.query;
        const { Op } = require('sequelize');

        const where = { UserId: userId };

        // 如果需要过滤含血检的记录
        if (hasLab == 1) {
            where[Op.or] = [
                { TSH: { [Op.ne]: null } },
                { FT4: { [Op.ne]: null } },
                { FT3: { [Op.ne]: null } },
                { T3: { [Op.ne]: null } },
                { T4: { [Op.ne]: null } }
            ];
        }

        const { count, rows } = await HealthRecord.findAndCountAll({
            where,
            order: [['recordDate', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // 处理多图 JSON 字符串
        const list = rows.map(item => {
            const row = item.toJSON();
            row.reportImage = RecordController.parseImages(row.reportImage);
            row.ultrasoundImage = RecordController.parseImages(row.ultrasoundImage);
            return row;
        });

        Response.success(ctx, {
            total: count,
            list
        });
    }

    // 获取单条记录详情
    static async detail(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;

        const record = await HealthRecord.findOne({
            where: { id, UserId: userId }
        });

        if (!record) {
            return Response.error(ctx, '记录不存在', 404);
        }

        // 处理多图 JSON 字符串
        const row = record.toJSON();
        row.reportImage = RecordController.parseImages(row.reportImage);
        row.ultrasoundImage = RecordController.parseImages(row.ultrasoundImage);

        Response.success(ctx, row);
    }

    // 获取趋势图数据 (最近12条记录)
    static async trend(ctx) {
        const userId = ctx.state.user.id;

        const list = await HealthRecord.findAll({
            where: { UserId: userId },
            attributes: ['recordDate', 'TSH', 'FT3', 'FT4', 'T3', 'T4'],
            order: [['recordDate', 'DESC']], // 改为倒序获取最新的
            limit: 12
        });

        // 取出后反转，变成按时间正序排列以便前端展示
        Response.success(ctx, list.reverse());
    }

    // 更新记录
    static async update(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;
        const data = ctx.request.body;

        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        // 数据清洗
        RecordController.cleanData(data);

        // 如果填写了B超数据但没填B超日期，默认使用主日期 (同步创建时的逻辑)
        if ((data.thyroidLeft || data.noduleCount || data.ultrasoundNote) && !data.ultrasoundDate) {
            data.ultrasoundDate = data.recordDate;
        }

        await record.update(data);
        Response.success(ctx, record, '记录已更新');
        logAction(ctx, '更新记录', '健康记录', `用户更新了日期为 ${record.recordDate} 的检查记录`);
    }

    // 删除记录
    static async delete(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;

        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        await record.destroy();
        Response.success(ctx, null, '记录已删除');
        logAction(ctx, '删除记录', '健康记录', `用户删除了日期为 ${record.recordDate} 的检查记录`);
    }
    // 辅助方法：解析图片 JSON 字符串，并确保返回扁平化的字符串数组
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
        // 深度清理：确保数组内是字符串，如果是嵌套数组则展开 (修复历史 Bug 产生的数据)
        return result.map(item => Array.isArray(item) ? item[0] : item).filter(i => i && typeof i === 'string');
    }
}

module.exports = RecordController;

