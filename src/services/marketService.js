const axios = require('axios');
const config = require('../config');
const { getCache, setCache } = require('./candleCache');

const priceCache = {};
const candleRequests = new Map();
const priceRequests = new Map();

// =====================================================
// GLOBAL TWELVEDATA REQUEST MANAGER
// =====================================================

const requestQueue = [];
let queueRunning = false;
let lastRequestTime = 0;
let cooldownUntil = 0;

// 1.8s between actual TwelveData HTTP requests.
// This is intentionally more conservative than the old 1.2s gap.
const MIN_REQUEST_GAP = 1800;

// One retry only after a 429. More retries create a traffic storm.
const MAX_429_RETRIES = 1;

// Shared cooldown after any TwelveData 429.
const GLOBAL_429_COOLDOWN_MS = 15000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatSymbol(pair) {
  pair = String(pair || '').toUpperCase();

  if (pair === 'XAUUSD') return 'XAU/USD';
  if (pair === 'XAGUSD') return 'XAG/USD';

  if (pair.length === 6) {
    return `${pair.slice(0, 3)}/${pair.slice(3, 6)}`;
  }

  return pair;
}

function enqueueRequest(task, label, priority = 0) {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      task,
      label,
      priority,
      resolve,
      reject,
      createdAt: Date.now()
    });

    // Higher priority first; FIFO inside same priority.
    requestQueue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      return a.createdAt - b.createdAt;
    });

    processQueue().catch(error => {
      console.log(
        '❌ Market data queue error:',
        error.message
      );
    });
  });
}

async function waitForGlobalSlot() {
  const now = Date.now();

  if (cooldownUntil > now) {
    const wait = cooldownUntil - now;

    console.log(
      `🧊 TwelveData global cooldown: ${Math.ceil(wait / 1000)}s`
    );

    await sleep(wait);
  }

  const elapsed = Date.now() - lastRequestTime;

  if (elapsed < MIN_REQUEST_GAP) {
    await sleep(
      MIN_REQUEST_GAP - elapsed
    );
  }

  lastRequestTime = Date.now();
}

async function processQueue() {
  if (queueRunning) return;

  queueRunning = true;

  try {
    while (requestQueue.length > 0) {
      const item = requestQueue.shift();

      try {
        await waitForGlobalSlot();

        const result =
          await item.task();

        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
  } finally {
    queueRunning = false;
  }
}

function activate429Cooldown(label) {
  const next =
    Date.now() +
    GLOBAL_429_COOLDOWN_MS;

  cooldownUntil =
    Math.max(
      cooldownUntil,
      next
    );

  console.log(
    `🧊 TwelveData global cooldown activated (${GLOBAL_429_COOLDOWN_MS / 1000}s): ${label}`
  );
}

async function requestWithRetry(
  url,
  options,
  label,
  priority = 0
) {
  let lastError;

  for (
    let attempt = 0;
    attempt <= MAX_429_RETRIES;
    attempt++
  ) {
    try {
      return await enqueueRequest(
        () => axios.get(url, options),
        label,
        priority
      );
    } catch (error) {
      lastError = error;

      const status =
        error.response?.status;

      if (status !== 429) {
        throw error;
      }

      console.log(
        `⚠️ TwelveData 429: ${label}`
      );

      activate429Cooldown(label);

      if (
        attempt <
        MAX_429_RETRIES
      ) {
        console.log(
          `⏳ ${label} queued retry ${attempt + 1}/${MAX_429_RETRIES}`
        );
      }
    }
  }

  throw lastError;
}

// =====================================================
// CANDLES
// =====================================================

async function getCandles(
  pair,
  interval = '15min'
) {
  const symbolKey =
    String(pair).toUpperCase();

  const intervalKey =
    String(interval || '15min');

  const key =
    `${symbolKey}:${intervalKey}`;

  const cached =
    getCache(key);

  if (cached) {
    console.log(
      '📦 Using candle cache:',
      key
    );

    return cached;
  }

  // Dedupe same pair + timeframe across all services.
  if (candleRequests.has(key)) {
    console.log(
      '⏳ Shared candle request:',
      key
    );

    return candleRequests.get(key);
  }

  const requestPromise =
    (async () => {
      try {
        const symbol =
          formatSymbol(symbolKey);

        console.log(
          '🌐 Queue candles:',
          symbolKey,
          intervalKey
        );

        // 5m is more latency-sensitive than 15m.
        const priority =
          intervalKey === '5min'
            ? 20
            : 10;

        const { data } =
          await requestWithRetry(
            'https://api.twelvedata.com/time_series',
            {
              params: {
                symbol,
                interval: intervalKey,
                outputsize: 50,
                apikey:
                  config.twelveDataKey
              },
              timeout: 15000
            },
            `candles ${symbolKey} ${intervalKey}`,
            priority
          );

        if (!data.values) {
          throw new Error(
            data.message ||
            `No candles received for ${symbolKey} ${intervalKey}`
          );
        }

        const candles =
          data.values
            .slice()
            .reverse()
            .map(c => ({
              open:
                Number(c.open),
              high:
                Number(c.high),
              low:
                Number(c.low),
              close:
                Number(c.close)
            }));

        setCache(
          key,
          candles
        );

        return candles;
      } finally {
        candleRequests.delete(key);
      }
    })();

  candleRequests.set(
    key,
    requestPromise
  );

  return requestPromise;
}

// =====================================================
// LIVE PRICE
// =====================================================

async function getPrice(pair) {
  const key =
    String(pair).toUpperCase();

  if (
    priceCache[key] &&
    Date.now() -
      priceCache[key].time <
      30000
  ) {
    console.log(
      '💰 Price cache:',
      key
    );

    return priceCache[key].price;
  }

  if (priceRequests.has(key)) {
    console.log(
      '⏳ Shared price request:',
      key
    );

    return priceRequests.get(key);
  }

  const requestPromise =
    (async () => {
      try {
        const symbol =
          formatSymbol(key);

        console.log(
          '🌐 Queue price:',
          key
        );

        // Trade monitoring price gets highest priority.
        const { data } =
          await requestWithRetry(
            'https://api.twelvedata.com/price',
            {
              params: {
                symbol,
                apikey:
                  config.twelveDataKey
              },
              timeout: 15000
            },
            `price ${key}`,
            30
          );

        if (!data.price) {
          throw new Error(
            data.message ||
            `No price received for ${key}`
          );
        }

        const price =
          Number(data.price);

        priceCache[key] = {
          price,
          time: Date.now()
        };

        return price;
      } finally {
        priceRequests.delete(key);
      }
    })();

  priceRequests.set(
    key,
    requestPromise
  );

  return requestPromise;
}

// =====================================================
// HEALTH / ADMIN
// =====================================================

function getMarketDataHealth() {
  return {
    queueLength:
      requestQueue.length,
    queueRunning,
    cooldownActive:
      cooldownUntil > Date.now(),
    cooldownRemainingMs:
      Math.max(
        0,
        cooldownUntil - Date.now()
      ),
    candleRequests:
      candleRequests.size,
    priceRequests:
      priceRequests.size,
    minRequestGap:
      MIN_REQUEST_GAP
  };
}

module.exports = {
  getCandles,
  getPrice,
  getMarketDataHealth
};
