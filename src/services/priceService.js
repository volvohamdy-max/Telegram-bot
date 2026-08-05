const axios = require('axios');
const config = require('../config');

async function getLivePrice(pair) {

  const { data } = await axios.get(
    "https://api.twelvedata.com/price",
    {
      params: {
        symbol: pair === "XAUUSD" ? "XAU/USD" : pair,
        apikey: config.twelveDataKey
      }
    }
  );

  if (!data.price) {
    throw new Error("No live price");
  }

  return Number(data.price);
}

module.exports = {
  getLivePrice
};
