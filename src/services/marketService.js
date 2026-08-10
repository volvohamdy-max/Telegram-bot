const axios = require('axios');
const config = require('../config');
const { getCache, setCache } = require('./candleCache');
const priceCache = {};

function formatSymbol(pair) {
  pair = pair.toUpperCase();

  if (pair.length === 6) {
    return `${pair.slice(0, 3)}/${pair.slice(3, 6)}`;
  }

  if (pair === "XAUUSD") return "XAU/USD";
  if (pair === "XAGUSD") return "XAG/USD";

  return pair;
}

async function getCandles(pair) {

const cached = getCache(pair);

if (cached) {
  console.log("📦 Using cache:", pair);
  return cached;
}
  const symbol = formatSymbol(pair);

  const { data } = await axios.get(
    "https://api.twelvedata.com/time_series",
    {
      params: {
        symbol,
        interval: "15min",
        outputsize: 50,
        apikey: config.twelveDataKey
      }
    }
  );

  if (!data.values) {
    throw new Error(data.message || "No candles received");
  }

 const candles = data.values.reverse().map(c => ({
  open: Number(c.open),
  high: Number(c.high),
  low: Number(c.low),
  close: Number(c.close)
}));

setCache(pair, candles);

return candles;
}
async function getPrice(pair) {

    const key = pair.toUpperCase();

    // استخدام الكاش
    if (
        priceCache[key] &&
        Date.now() - priceCache[key].time < 30000
    ) {
        console.log("💰 Price cache:", key);
        return priceCache[key].price;
    }


    const symbol = formatSymbol(pair);

    const { data } = await axios.get(
        "https://api.twelvedata.com/price",
        {
            params: {
                symbol,
                apikey: config.twelveDataKey
            }
        }
    );


    if (!data.price) {
        throw new Error(data.message || "No price received");
    }


    const price = Number(data.price);


    // حفظ السعر
    priceCache[key] = {
        price,
        time: Date.now()
    };


    return price;
}

module.exports = { getCandles, getPrice };
