const Response = require('../utils/response');
const OcrService = require('../services/OcrService');
const logger = require('../utils/logger');

/**
 * OCR控制器 - 用于识别化验单和B超报告
 */
class OcrController {
    /**
     * 识别化验单/B超报告图片
     * POST /api/ocr/recognize
     * Body: { image: base64图片数据, type: 'lab'|'ultrasound' }
     */
    static async recognize(ctx) {
        const { image, type = 'lab' } = ctx.request.body;

        if (!image) {
            return Response.error(ctx, '请上传报告图片');
        }

        try {
            // 1. 调用 OCR 服务进行文字提取
            const ocrResult = await OcrService.callTencentOCR(image);

            // 2. 根据类型解析 OCR 结果
            let result;
            if (type === 'ultrasound') {
                result = OcrService.parseUltrasound(ocrResult);
            } else {
                result = OcrService.parseIndicators(ocrResult);
            }

            logger.info(`OCR识别成功: 类型=${type}, 指标数=${result.count}`);
            Response.success(ctx, result, '识别成功');
        } catch (error) {
            logger.error('OCR识别失败', { message: error.message, type });
            Response.error(ctx, error.message || '识别服务异常，请手动录入');
        }
    }
}

module.exports = OcrController;
