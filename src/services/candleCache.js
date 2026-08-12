const cache = {};

// Cache TTL حسب الفريم
function getTTL(key) {
  const value = String(key || '').toLowerCase();

  // Gold 5M scalping needs very fresh data
  if (
    value.includes('xauusd') &&
    value.includes('5min')
  ) {
    return 30 * 1000; // 30 seconds
  }

  // 15M trend doesn't need refreshing every few seconds
  if (
    value.includes('xauusd') &&
    value.includes('15min')
  ) {
    return 2 * 60 * 1000; // 2 minutes
  }

  return 5 * 60 * 1000; // 5 minutes
}

function getCache(pair) {
  const item = cache[pair];

  if (!item) return null;

  const ttl = getTTL(pair);
  const age = Date.now() - item.time;

  if (age > ttl) {
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
