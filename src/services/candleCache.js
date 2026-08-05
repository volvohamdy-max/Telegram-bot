const cache = {};

function getCache(pair) {
  const item = cache[pair];

  if (!item) return null;

  // صلاحية الكاش 5 دقائق
  if (Date.now() - item.time > 300000) {
    delete cache[pair];
    return null;
  }

  return item.data;
}

function setCache(pair, data) {
  cache[pair] = {
    data,
    time: Date.now()
  };
}

module.exports = {
  getCache,
  setCache
};
