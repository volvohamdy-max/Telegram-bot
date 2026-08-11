const { scanTrends } = require('./trendHunter');
const { getBestTrade } = require('./bestTrade');

function rankStatus(status) {
  const map = {
    ENTRY_READY: 5,
    WAIT_PULLBACK: 4,
    TREND_FOUND: 3,
    NO_TREND: 2,
    NO_DATA: 1,
    ERROR: 0
  };
  return map[status] ?? 0;
}

function sessionInfo() {
  const hour = new Date().getUTCHours();

  if (hour >= 0 && hour < 7) {
    return { key: 'asia', ar: 'الجلسة الآسيوية', en: 'Asian Session' };
  }
  if (hour >= 7 && hour < 13) {
    return { key: 'london', ar: 'جلسة لندن', en: 'London Session' };
  }
  if (hour >= 13 && hour < 21) {
    return { key: 'newyork', ar: 'جلسة نيويورك', en: 'New York Session' };
  }
  return { key: 'late', ar: 'الفترة الهادئة', en: 'Late Session' };
}

function sessionBonus(pair, session) {
  const bonuses = {
    asia: { USDJPY: 6, EURJPY: 5, GBPJPY: 5, CHFJPY: 4, XAUUSD: 2 },
    london: { EURUSD: 6, GBPUSD: 6, GBPJPY: 5, EURJPY: 4, XAUUSD: 3 },
    newyork: { XAUUSD: 7, EURUSD: 5, GBPUSD: 5, USDJPY: 4, BTCUSD: 3 },
    late: { BTCUSD: 4, XAUUSD: 1 }
  };
  return bonuses[session.key]?.[pair] || 0;
}

function decisionScore(item, session) {
  let score = Number(item.score) || 0;

  if (item.status === 'ENTRY_READY') score += 12;
  else if (item.status === 'WAIT_PULLBACK') score += 6;
  else if (item.status === 'TREND_FOUND') score += 3;

  score += sessionBonus(item.pair, session);

  if (Number(item.aiConfidence) >= 80) score += 4;
  if (Number(item.adx) >= 30) score += 4;
  if (Number(item.adx) >= 35) score += 2;

  return Math.round(Math.max(0, Math.min(100, score)));
}

async function buildMarketMap() {
  const session = sessionInfo();
  const trends = await scanTrends();

  const ranked = trends
    .map((item) => ({
      ...item,
      marketScore: decisionScore(item, session)
    }))
    .sort((a, b) => {
      const byStatus = rankStatus(b.status) - rankStatus(a.status);
      if (byStatus !== 0) return byStatus;
      return b.marketScore - a.marketScore;
    });

  let bestTrade = null;
  try {
    bestTrade = await getBestTrade();
  } catch (error) {
    console.log('Market Map bestTrade error:', error.message);
  }

  return { session, ranked, bestTrade };
}

module.exports = { buildMarketMap, sessionInfo };
