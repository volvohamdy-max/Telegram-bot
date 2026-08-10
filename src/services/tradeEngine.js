// Sprint 4 helper: one source of truth for trade quality + levels.
// This module does NOT fetch market data itself.

function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function trueRange(current, previousClose) {
  const high = Number(current?.high);
  const low = Number(current?.low);
  const prev = Number(previousClose);

  if (!Number.isFinite(high) || !Number.isFinite(low)) {
    return null;
  }

  if (!Number.isFinite(prev)) {
    return high - low;
  }

  return Math.max(
    high - low,
    Math.abs(high - prev),
    Math.abs(low - prev)
  );
}

function calculateATR(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length < period + 1) {
    return null;
  }

  const sample = candles.slice(-(period + 1));
  const trs = [];

  for (let i = 1; i < sample.length; i++) {
    const tr = trueRange(sample[i], sample[i - 1]?.close);
    if (Number.isFinite(tr) && tr > 0) trs.push(tr);
  }

  if (trs.length < Math.max(5, Math.floor(period * 0.7))) {
    return null;
  }

  return trs.reduce((sum, v) => sum + v, 0) / trs.length;
}

function calculateTradeLevels(candles, direction) {
  if (!Array.isArray(candles) || candles.length < 15) {
    return null;
  }

  const entry = Number(candles.at(-1)?.close);
  if (!Number.isFinite(entry) || entry <= 0) return null;

  const atr = calculateATR(candles, 14);
  if (!Number.isFinite(atr) || atr <= 0) return null;

  // Fixed risk geometry:
  // TP1 = 1R, TP2 = 2R, where 1R = 1.2 ATR.
  // The same engine returns Entry/SL/TP to every UI consumer.
  const riskDistance = atr * 1.2;
  const tp1Distance = riskDistance;
  const tp2Distance = riskDistance * 2;

  let sl;
  let tp1;
  let tp2;

  if (direction === 'BUY') {
    sl = entry - riskDistance;
    tp1 = entry + tp1Distance;
    tp2 = entry + tp2Distance;
  } else if (direction === 'SELL') {
    sl = entry + riskDistance;
    tp1 = entry - tp1Distance;
    tp2 = entry - tp2Distance;
  } else {
    return null;
  }

  return {
    entry,
    sl,
    tp1,
    tp2,
    atr,
    riskDistance,
    rrTp1: 1,
    rrTp2: 2
  };
}

function technicalScoreFromAnalysis(analysis, direction) {
  const buy = clamp((Number(analysis?.buyScore) || 0) * 25);
  const sell = clamp((Number(analysis?.sellScore) || 0) * 25);
  return direction === 'BUY' ? buy : sell;
}

function calculateFinalScore({
  smartScore,
  aiConfidence,
  technicalScore,
  historicalScore,
  similarSetups,
  tp1Rate,
  slRate,
  labApproved
}) {
  const smart = clamp(smartScore);
  const ai = clamp(aiConfidence);
  const technical = clamp(technicalScore);
  const historical = clamp(historicalScore);
  const setups = Math.max(0, Number(similarSetups) || 0);

  // Base: market scanner + technical confirmation.
  let weighted = smart * 0.55 + technical * 0.20;
  let weight = 0.75;

  // AI only contributes when an actual AI confidence exists.
  if (ai > 0) {
    weighted += ai * 0.15;
    weight += 0.15;
  }

  // Historical data only contributes when sample size is meaningful.
  if (setups >= 10) {
    weighted += historical * 0.10;
    weight += 0.10;
  }

  // Re-normalize instead of pretending missing data is positive evidence.
  let finalScore = weight > 0 ? weighted / weight : 0;

  // Small evidence-based modifiers; capped to avoid dominating the score.
  if (setups >= 10 && Number(tp1Rate) >= 60 && Number(slRate) <= 40) {
    finalScore += 3;
  }
  if (setups >= 10 && labApproved) {
    finalScore += 2;
  }
  if (setups >= 10 && Number(slRate) > 55) {
    finalScore -= 6;
  }

  return Math.round(clamp(finalScore));
}

function getStrength(score) {
  const s = clamp(score);
  if (s >= 85) return 'VERY_STRONG';
  if (s >= 75) return 'STRONG';
  if (s >= 65) return 'MODERATE';
  return 'WEAK';
}

module.exports = {
  calculateATR,
  calculateTradeLevels,
  technicalScoreFromAnalysis,
  calculateFinalScore,
  getStrength
};
