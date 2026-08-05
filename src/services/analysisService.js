const { getCandles } = require('./marketService');
const analyzeIndicators = require('../indicators/analyzer');
const { askOpenAI } = require('../ai/openaiService');

async function analyzePair(pair) {

    const candles = await getCandles(pair);

    const indicators = analyzeIndicators(candles);

    const {
        ema20,
        ema50,
        rsi,
        macd
    } = indicators;


    let allowAI = false;


    // فلتر شراء
    if (
        ema20 > ema50 &&
        rsi > 50 &&
        macd.macd > macd.signal
    ) {
        allowAI = true;
    }


    // فلتر بيع
    if (
        ema20 < ema50 &&
        rsi < 50 &&
        macd.macd < macd.signal
    ) {
        allowAI = true;
    }


    // لا يوجد توافق مؤشرات
    if (!allowAI) {

        return {
            pair: pair.toUpperCase(),
            indicators,
            signal: null
        };

    }


    // فقط هنا نستدعي الذكاء الاصطناعي
    const signal = await askOpenAI(pair, indicators);


    return {
        pair: pair.toUpperCase(),
        indicators,
        signal
    };

}


module.exports = { analyzePair };
