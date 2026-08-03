const axios = require('axios');
const config = require('../config');

function fallbackCandles() {
  const candles = [];
  let price = 1.08;
  for (let i = 0; i < 80; i += 1) {
    const wave = Math.sin(i / 5) * 0.001;
    const open = price;
    const close = open + wave + (i % 3 - 1) * 0.0002;
    candles.push({ open, high: Math.max(open, close) + 0.0008, low: Math.min(open, close) - 0.0008, close });
    price = close;
  }
  return candles;
}

async function getCandles(pair) {
  if (!config.marketApiUrl) return fallbackCandles(pair);
  const { data } = await axios.get(config.marketApiUrl, { params: { pair, limit: 100 } });
  return data.candles || data;
}

module.exports = { getCandles };
