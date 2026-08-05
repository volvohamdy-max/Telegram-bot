const { analyzePair } = require('./analysisService');
const { allUsers } = require('../database/users');
const { addTrade } = require('../database/trades');
const { getLivePrice } = require('./priceService');
const { saveSignal } = require('./signalCache');
const PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
  "NZDUSD",
  "EURJPY",
  "GBPJPY",
  "XAUUSD"
];

let lastSignals = {};

async function scanMarket(bot) {

  console.log("🔍 Scanning Market...");

  for (const pair of PAIRS) {
await new Promise(r => setTimeout(r, 15000));

    try {

      const result = await analyzePair(pair);
      saveSignal(pair, result);
      console.log("AI RESULT:", pair, result);

      if (!result.signal) continue;
if (
  result.signal.action !== "BUY" &&
  result.signal.action !== "SELL"
) continue;
      if (result.signal.confidence < 55) continue;

      const key =
        pair +
        result.signal.action +
        result.signal.entry;

      if (lastSignals[pair] === key)
        continue;

      lastSignals[pair] = key;
// حفظ الصفقة في قاعدة البيانات
addTrade({
  telegram_id: "VIP",
  pair: pair,
  action: result.signal.action,
  entry: result.signal.entry,
  stop_loss: result.signal.stopLoss,
  target1: result.signal.targets[0],
  target2: result.signal.targets[1] || null
});
const livePrice = await getLivePrice(pair); 
      const message =
`🚨 إشارة VIP قوية

📊 الزوج: ${pair}

📈 الاتجاه: ${result.signal.action}

🎯 الدخول: ${livePrice}

🛑 وقف الخسارة:
${result.signal.stopLoss}

🎯 الهدف الأول:
${result.signal.targets[0]}

🎯 الهدف الثاني:
${result.signal.targets[1] || "-"}

🔥 الثقة:
${result.signal.confidence}%`;

      const users = allUsers();
for (const user of users) {
  try {
    await bot.telegram.sendMessage(
  user.telegram_id,
  message
).catch(err => {
  if (err.response?.error_code === 400) {
    console.log(`⚠️ User unavailable: ${user.telegram_id}`);
  }
});
  } catch (e) {
    console.log(`Send failed ${user.telegram_id}:`, e.message);
  }
}
      console.log("✅ Signal Sent:", pair);

    } catch (e) {

      console.log(pair, e.message);

    }

  }

  console.log("✅ Market Scan Finished");

}

module.exports = { scanMarket };
