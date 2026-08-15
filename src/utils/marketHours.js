function isForexWeekend() {
  const day = new Date().getUTCDay();
  return day === 6 || day === 0;
}

function isCryptoPair(pair) {
  return String(pair || '').toUpperCase() === 'BTCUSD';
}

function isPairMarketOpen(pair) {
  if (isCryptoPair(pair)) return true;
  return !isForexWeekend();
}

module.exports = {
  isForexWeekend,
  isCryptoPair,
  isPairMarketOpen
};
