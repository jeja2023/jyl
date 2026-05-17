const toPositiveInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getPagination = (query = {}, options = {}) => {
    const defaultPage = options.defaultPage || 1;
    const defaultPageSize = options.defaultPageSize || 20;
    const maxPageSize = options.maxPageSize || 100;

    const page = toPositiveInt(query.page, defaultPage);
    const pageSize = clamp(toPositiveInt(query.pageSize ?? query.limit, defaultPageSize), 1, maxPageSize);
    const rawOffset = query.offset !== undefined ? parseInt(query.offset, 10) : null;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : (page - 1) * pageSize;

    return { page, pageSize, limit: pageSize, offset };
};

module.exports = { getPagination };
