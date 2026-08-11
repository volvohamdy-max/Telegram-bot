const { analyzePair } = require('./analysisService');
const { getCandles } = require('./marketService');
const { calculateTradeLevels } = require('./tradeEngine');

const PAIRS = ['XAUUSD','BTCUSD','EURUSD','GBPUSD','USDJPY','EURJPY','GBPJPY','CHFJPY'];

function clamp(n, min = 0, max = 100) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function getDirection(indicators) {
  const ema20 = Number(indicators?.ema20);
  const ema50 = Number(indicators?.ema50);
  const macd = Number(indicators?.macd?.macd);
  const signal = Number(indicators?.macd?.signal);
  if ([ema20, ema50, macd, signal].every(Number.isFinite)) {
    if (ema20 > ema50 && macd > signal) return 'BUY';
    if (ema20 < ema50 && macd < signal) return 'SELL';
  }
  return 'WAIT';
}

function scoreTrend({ indicators, analysis, direction }) {
  const ema20 = Number(indicators?.ema20);
  const ema50 = Number(indicators?.ema50);
  const rsi = Number(indicators?.rsi);
  const adx = Number(indicators?.adx);
  const macd = Number(indicators?.macd?.macd);
  const macdSignal = Number(indicators?.macd?.signal);
  const aiConfidence = clamp(analysis?.signal?.confidence);
  let score = 0;

  if (direction === 'BUY' && ema20 > ema50) score += 25;
  if (direction === 'SELL' && ema20 < ema50) score += 25;
  if (direction === 'BUY' && macd > macdSignal) score += 20;
  if (direction === 'SELL' && macd < macdSignal) score += 20;

  if (Number.isFinite(adx)) {
    if (adx >= 35) score += 25;
    else if (adx >= 30) score += 22;
    else if (adx >= 25) score += 18;
    else if (adx >= 20) score += 10;
  }

  if (Number.isFinite(rsi)) {
    if (direction === 'BUY') {
      if (rsi >= 52 && rsi <= 66) score += 15;
      else if (rsi > 50 && rsi < 70) score += 10;
      else if (rsi >= 70) score += 3;
    } else if (direction === 'SELL') {
      if (rsi >= 34 && rsi <= 48) score += 15;
      else if (rsi > 30 && rsi < 50) score += 10;
      else if (rsi <= 30) score += 3;
    }
  }

  const aiAction = String(analysis?.signal?.action || '').toUpperCase();
  if (aiAction === direction) {
    if (aiConfidence >= 85) score += 15;
    else if (aiConfidence >= 75) score += 12;
    else if (aiConfidence >= 65) score += 8;
    else if (aiConfidence >= 60) score += 5;
  }

  return Math.round(clamp(score));
}

function classify({ indicators, analysis, direction, score }) {
  const adx = Number(indicators?.adx);
  const rsi = Number(indicators?.rsi);
  const aiAction = String(analysis?.signal?.action || '').toUpperCase();
  const aiConfidence = Number(analysis?.signal?.confidence) || 0;

  if (direction === 'WAIT' || !Number.isFinite(adx) || adx < 20) return 'NO_TREND';

  const overheated =
    (direction === 'BUY' && Number.isFinite(rsi) && rsi >= 68) ||
    (direction === 'SELL' && Number.isFinite(rsi) && rsi <= 32);
  if (overheated && score >= 65) return 'WAIT_PULLBACK';

  const rsiReady = direction === 'BUY'
    ? Number.isFinite(rsi) && rsi >= 52 && rsi <= 66
    : Number.isFinite(rsi) && rsi >= 34 && rsi <= 48;

  const aiReady = aiAction === direction && aiConfidence >= 70 && !analysis?.aiDirectionMismatch;

  if (score >= 78 && adx >= 25 && rsiReady && aiReady) return 'ENTRY_READY';
  if (score >= 65) return 'TREND_FOUND';
  return 'NO_TREND';
}

async function analyzeTrend(pair) {
  const analysis = await analyzePair(pair);
  if (!analysis || !analysis.indicators) return { pair, direction: 'WAIT', status: 'NO_DATA', score: 0 };

  const indicators = analysis.indicators;
  const direction = getDirection(indicators);
  const score = scoreTrend({ indicators, analysis, direction });
  const status = classify({ indicators, analysis, direction, score });
  let levels = null;

  if (status === 'ENTRY_READY') {
    try {
      const candles = await getCandles(pair);
      levels = calculateTradeLevels(candles, direction);
    } catch (error) {
      console.log(`⚠️ Trend Hunter levels ${pair}:`, error.message);
    }
  }

  return {
    pair, direction, status, score,
    aiConfidence: Number(analysis?.signal?.confidence) || 0,
    adx: Number(indicators?.adx),
    rsi: Number(indicators?.rsi),
    levels
  };
}

async function scanTrends() {
  const results = [];
  for (const pair of PAIRS) {
    try { results.push(await analyzeTrend(pair)); }
    catch (error) {
      console.log(`❌ Trend Hunter ${pair}:`, error.message);
      results.push({ pair, direction: 'WAIT', status: 'ERROR', score: 0 });
    }
  }
  const order = { ENTRY_READY: 5, WAIT_PULLBACK: 4, TREND_FOUND: 3, NO_TREND: 2, NO_DATA: 1, ERROR: 0 };
  return results.sort((a,b) => ((order[b.status]||0)-(order[a.status]||0)) || (Number(b.score||0)-Number(a.score||0)));
}

module.exports = { PAIRS, analyzeTrend, scanTrends };
