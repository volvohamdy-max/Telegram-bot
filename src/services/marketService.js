const axios = require('axios');
const config = require('../config');
const { getCache, setCache } = require('./candleCache');

const priceCache = {};
const candleRequests = new Map();
const priceRequests = new Map();

let lastRequestTime = 0;
const MIN_REQUEST_GAP = 1200; // 1.2 ثانية بين طلبات TwelveData

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForApiSlot() {
  const elapsed = Date.now() - lastRequestTime;

  if (elapsed < MIN_REQUEST_GAP) {
    await sleep(MIN_REQUEST_GAP - elapsed);
  }

  lastRequestTime = Date.now();
}

function formatSymbol(pair) {
  pair = pair.toUpperCase();

  if (pair === 'XAUUSD') return 'XAU/USD';
  if (pair === 'XAGUSD') return 'XAG/USD';

  if (pair.length === 6) {
    return `${pair.slice(0, 3)}/${pair.slice(3, 6)}`;
  }

  return pair;
}

async function requestWithRetry(url, options, label) {
  const waits = [0, 3000, 7000, 15000];

  let lastError;

  for (let attempt = 0; attempt < waits.length; attempt++) {
    if (waits[attempt] > 0) {
      console.log(
        `⏳ ${label} retry ${attempt}/${waits.length - 1} after ${waits[attempt]}ms`
      );
      await sleep(waits[attempt]);
    }

    await waitForApiSlot();

    try {
      return await axios.get(url, options);
    } catch (error) {
      lastError = error;

      const status = error.response?.status;

      if (status !== 429) {
        throw error;
      }

      console.log(`⚠️ TwelveData 429: ${label}`);
    }
  }

  throw lastError;
}

async function getCandles(pair) {
  const key = pair.toUpperCase();

  const cached = getCache(key);

  if (cached) {
    console.log('📦 Using candle cache:', key);
    return cached;
  }

  // لو نفس الزوج بيتجاب بالفعل، استنى نفس الـPromise
  if (candleRequests.has(key)) {
    console.log('⏳ Waiting existing candle request:', key);
    return candleRequests.get(key);
  }

  const requestPromise = (async () => {
    try {
      const symbol = formatSymbol(key);

      console.log('🌐 Fetching candles:', key);

      const { data } = await requestWithRetry(
        'https://api.twelvedata.com/time_series',
        {
          params: {
            symbol,
            interval: '15min',
            outputsize: 50,
            apikey: config.twelveDataKey
          },
          timeout: 15000
        },
        `candles ${key}`
      );

      if (!data.values) {
        throw new Error(
          data.message || `No candles received for ${key}`
        );
      }

      const candles = data.values
        .slice()
        .reverse()
        .map(c => ({
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close)
        }));

      setCache(key, candles);

      return candles;
    } finally {
      candleRequests.delete(key);
    }
  })();

  candleRequests.set(key, requestPromise);

  return requestPromise;
}

async function getPrice(pair) {
  const key = pair.toUpperCase();

  if (
    priceCache[key] &&
    Date.now() - priceCache[key].time < 30000
  ) {
    console.log('💰 Price cache:', key);
    return priceCache[key].price;
  }

  if (priceRequests.has(key)) {
    console.log('⏳ Waiting existing price request:', key);
    return priceRequests.get(key);
  }

  const requestPromise = (async () => {
    try {
      const symbol = formatSymbol(key);

      const { data } = await requestWithRetry(
        'https://api.twelvedata.com/price',
        {
          params: {
            symbol,
            apikey: config.twelveDataKey
          },
          timeout: 15000
        },
        `price ${key}`
      );

      if (!data.price) {
        throw new Error(
          data.message || `No price received for ${key}`
        );
      }

      const price = Number(data.price);

      priceCache[key] = {
        price,
        time: Date.now()
      };

      return price;
    } finally {
      priceRequests.delete(key);
    }
  })();

  priceRequests.set(key, requestPromise);

  return requestPromise;
}

module.exports = {
  getCandles,
  getPrice
};
