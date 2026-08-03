const { getCandles } = require('./marketService');
const analyzeIndicators = require('../indicators/analyzer');
const { askOpenAI } = require('../ai/openaiService');

async function analyzePair(pair) {
  const candles = await getCandles(pair);
  const indicators = analyzeIndicators(candles);
  const signal = await askOpenAI(pair, indicators);
  return { pair: pair.toUpperCase(), indicators, signal };
}

module.exports = { analyzePair };
