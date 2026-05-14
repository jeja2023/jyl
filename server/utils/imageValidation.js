const SIGNATURES = [
    { ext: 'jpg', mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
    { ext: 'png', mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { ext: 'webp', mime: 'image/webp', riff: true }
];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_IMAGE_BYTES = 7.5 * 1024 * 1024;

const normalizeExt = (ext) => {
    const clean = String(ext || '').toLowerCase().replace(/^\./, '');
    return clean === 'jpeg' ? 'jpg' : clean;
};

const detectImageType = (buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

    for (const sig of SIGNATURES) {
        if (sig.riff) {
            if (
                buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
                buffer.slice(8, 12).toString('ascii') === 'WEBP'
            ) {
                return { ext: sig.ext, mime: sig.mime };
            }
            continue;
        }

        const matches = sig.bytes.every((byte, index) => buffer[index] === byte);
        if (matches) return { ext: sig.ext, mime: sig.mime };
    }

    return null;
};

const validateImageBuffer = (buffer, expectedExt) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error('图片文件为空');
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
        throw new Error('图片文件太大，请上传10MB以下的图片');
    }

    const detected = detectImageType(buffer);
    if (!detected) {
        throw new Error('图片文件类型校验失败，仅支持jpg/png/webp格式');
    }

    const normalizedExpected = normalizeExt(expectedExt);
    if (normalizedExpected && normalizedExpected !== detected.ext) {
        throw new Error('图片扩展名与实际文件类型不一致');
    }

    return detected;
};

const parseBase64Image = (image) => {
    const matches = String(image || '').match(/^data:image\/([\w+-]+);base64,(.+)$/);
    if (!matches) {
        throw new Error('无效的图片格式');
    }

    const ext = normalizeExt(matches[1]);
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > MAX_BASE64_IMAGE_BYTES) {
        throw new Error('图片文件太大，请上传10MB以下的图片');
    }

    const detected = validateImageBuffer(buffer, ext);
    return { buffer, ext: detected.ext, mime: detected.mime };
};

module.exports = {
    MAX_IMAGE_BYTES,
    detectImageType,
    normalizeExt,
    parseBase64Image,
    validateImageBuffer
};
