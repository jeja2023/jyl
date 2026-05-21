import { getBaseURL } from '@/utils/config.js';

const REPORT_PREFIX = '/storage/reports/';

const appendQuery = (url, params) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  if (!query) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
};

export const getReportImageFilename = (path) => {
  if (!path) return '';
  const cleanPath = String(path).split('?')[0];
  return cleanPath.split('/').filter(Boolean).pop() || '';
};

export const isReportImagePath = (path) => {
  if (!path) return false;
  const value = String(path);
  if (value.startsWith(REPORT_PREFIX)) return true;

  try {
    // 兼容部分移动端 JS 引擎中 URL 构造函数不可用的情况，优先使用高鲁棒性的正则解析 fallback
    const match = value.match(/^https?:\/\/[^/]+(\/.*)/i);
    if (match) {
      return match[1].startsWith(REPORT_PREFIX);
    }
    const url = new URL(value);
    return url.pathname.startsWith(REPORT_PREFIX);
  } catch (e) {
    return false;
  }
};

export const buildReportImageUrl = (path, options = {}) => {
  if (!path) return '';
  const value = String(path);
  if ((value.startsWith('http') || value.startsWith('blob:')) && !isReportImagePath(value)) {
    return value;
  }

  if (!isReportImagePath(value)) {
    return value.startsWith('http') ? value : `${getBaseURL()}${value}`;
  }

  const filename = getReportImageFilename(value);
  if (!filename) return '';

  const url = `${getBaseURL()}/api/report/image/${encodeURIComponent(filename)}`;
  return appendQuery(url, {
    authToken: options.authToken,
    shareToken: options.shareToken
  });
};
