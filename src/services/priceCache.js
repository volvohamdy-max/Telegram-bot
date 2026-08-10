const cache = {};

function setPrice(pair, price) {
    cache[pair] = {
        price,
        time: Date.now()
    };
}

function getCachedPrice(pair) {

const CACHE_TIME = 5 * 60 * 1000; // 5 دقائق

if (Date.now() - item.time > CACHE_TIME) {
    delete cache[pair];
    return null;
}
    return item.price;
}

module.exports = {
    setPrice,
    getCachedPrice
};
