const cache = {};

function setPrice(pair, price) {
    cache[pair] = {
        price,
        time: Date.now()
    };
}

function getCachedPrice(pair) {

    const item = cache[pair];

    if (!item) return null;

    // صلاحية الكاش دقيقة واحدة
    if (Date.now() - item.time > 60000) {
        delete cache[pair];
        return null;
    }

    return item.price;
}

module.exports = {
    setPrice,
    getCachedPrice
};
