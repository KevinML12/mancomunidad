export function pageWindow(query = {}) {
  const requestedPage = Number(query.page ?? 1);
  const requestedLimit = Number(query.limit ?? 50);
  const limit = Number.isSafeInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, Math.floor(100_000 / limit) + 1) : 1;
  return { page, limit, skip: (page - 1) * limit, take: limit + 1 };
}

export function sendPage(res, rows, { page, limit }) {
  if (rows.length > limit) res.set('X-Next-Page', String(page + 1));
  res.json(rows.slice(0, limit));
}
