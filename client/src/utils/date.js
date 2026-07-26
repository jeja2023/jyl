/**
 * 日期格式化工具。
 *
 * 此前 13 个页面各自写了一份 formatDate，格式还不完全一样
 * （YYYY-MM-DD / YYYY.MM.DD / YYYY-MM-DD HH:mm 混用），
 * 其中"把 Date 转成 YYYY-MM-DD 回填 picker"这一段是逐字重复的。
 * 这里统一实现，各页面按需传 pattern，输出与改动前保持一致。
 */

const pad = (value) => String(value).padStart(2, '0');

/** 把各种输入统一成 Date，无法解析时返回 null */
export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  let normalized = value;
  if (typeof value === 'string') {
    // ISO 时间戳（含 T，多为后端返回的 createdAt）必须原样交给 Date，
    // 替换连字符会让它变成 Invalid Date。
    // 其余 'YYYY-MM-DD' / 'YYYY-MM-DD HH:mm' 换成斜杠：
    // 一是 iOS 不接受空格分隔，二是避免纯日期被当作 UTC 午夜导致跨时区差一天。
    normalized = value.includes('T') ? value : value.replace(/-/g, '/');
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * 按 pattern 格式化，支持 YYYY / MM / DD / HH / mm / ss
 * @param {Date|string|number} value
 * @param {string} pattern 默认 'YYYY-MM-DD'
 * @param {string} fallback 无法解析时的返回值
 */
export const formatDate = (value, pattern = 'YYYY-MM-DD', fallback = '') => {
  const date = toDate(value);
  if (!date) return fallback;

  return pattern
    .replace('YYYY', date.getFullYear())
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()));
};

/** YYYY-MM-DD，用于 picker 回填和提交给后端的日期字段 */
export const toDateStr = (value = new Date()) => formatDate(value, 'YYYY-MM-DD');

/** YYYY-MM-DD HH:mm */
export const toDateTimeStr = (value) => formatDate(value, 'YYYY-MM-DD HH:mm');

/** 今天的 YYYY-MM-DD */
export const todayStr = () => toDateStr(new Date());

/** 跟随系统区域设置的日期，百科列表等处使用 */
export const toLocaleDateStr = (value, fallback = '') => {
  const date = toDate(value);
  return date ? date.toLocaleDateString() : fallback;
};
