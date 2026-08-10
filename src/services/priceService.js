const axios = require('axios');
const config = require('../config');

const cache = {};

async function getLivePrice(pair) {

    const key = pair.toUpperCase();

    // استخدام الكاش لمدة 5 دقائق
    if (
        cache[key] &&
        Date.now() - cache[key].time < 300000
    ) {
        console.log("💰 Using price cache:", key);
        return cache[key].price;
    }

    const symbol = key === "XAUUSD" ? "XAU/USD" : key;

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
        throw new Error(data.message || "No live price");
    }

    const price = Number(data.price);

    cache[key] = {
        price,
        time: Date.now()
    };

    return price;
}

module.exports = {
    getLivePrice
};
