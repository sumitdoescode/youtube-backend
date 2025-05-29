export const parsePagination = (query = {}, options = {}) => {
    const { defaultPage = 1, defaultLimit = 10, maxPage = 1000, maxLimit = 50 } = options;
    let { page = defaultPage, limit = defaultLimit } = query;

    page = Math.max(1, parseInt(page) || defaultPage);
    limit = Math.max(1, parseInt(limit) || defaultLimit);

    // Apply maximum limits
    page = Math.min(page, maxPage);
    limit = Math.min(limit, maxLimit);

    return { page, limit };
};
