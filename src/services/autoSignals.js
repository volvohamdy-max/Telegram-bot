const { analyzePair } = require('./analysisGate');
const { allUsers } = require('../database/users');
const { addTrade } = require('../database/trades');
const { getLivePrice } = require('./priceService');
const { getCandles } = require('./marketService');
const { calculateTradeLevels } = require('./tradeEngine');
const { saveSignal } = require('./signalCache');
const { evaluateScalpEntry } = require('./scalpingEntryEngine');
const config = require('../config');
const {
  getBoolSetting,
  getNumberSetting
} = require('../database/adminControl');
const PAIRS = [
  
  "XAUUSD"
];

let lastSignals = {};

async function scanMarket(bot) {
  if (!getBoolSetting('auto_signals_enabled', true)) {
    console.log('⏸️ Auto Signals disabled from Admin Control Center');
    return;
  }
  const scanStart = Date.now();
  console.log("🚀 SCAN START:", new Date().toLocaleTimeString());
console.log("🚨 AUTO SIGNALS FILE IS RUNNING");
  console.log("🔍 Scanning Market...");

  for (const pair of PAIRS) {

    try {

      const result = await analyzePair(pair);
console.log("🧠 SIGNAL DEBUG:", JSON.stringify({
    pair,
    signal: result.signal,
    indicators: result.indicators
}, null, 2));
console.log(
    "🧠 ANALYSIS RESULT:",
    JSON.stringify(result, null, 2)
);

saveSignal(pair, result);
      console.log("AI RESULT:", pair, result);

      if (!result.signal) continue;
if (
  result.signal.action !== "BUY" &&
  result.signal.action !== "SELL"
) continue;
      const confidence = Number(result.signal.confidence);

      if (!Number.isFinite(confidence)) {
        console.log(`❌ Invalid AI confidence: ${pair}`);
        continue;
      }

      const minAiConfidence = getNumberSetting('min_ai_confidence', 60);

      if (confidence < minAiConfidence) {
        console.log(
          `❌ Auto signal rejected: ${pair} confidence ${confidence}% < ${minAiConfidence}%`
        );
        continue;
      }

      const candles = await getCandles(pair);

      const levels = calculateTradeLevels(
        candles,
        result.signal.action,
        pair
      );

      if (!levels) {
        console.log(
          `❌ Auto signal rejected: ${pair} invalid Smart TP/SL levels`
        );
        continue;
      }

      if (
        pair === 'XAUUSD' &&
        Number(levels.riskPct) >
        getNumberSetting('gold_max_risk_pct', 0.35)
      ) {
        console.log(
          `❌ Auto signal rejected: ${pair} stop too wide for scalp (${Number(levels.riskPct).toFixed(2)}%)`
        );
        continue;
      }

      // AUTO SCALP ENTRY
      const scalpEntry = await evaluateScalpEntry(
        pair,
        result.signal.action,
        result.indicators
      );

      if (scalpEntry.status !== 'ENTRY_READY') {
        console.log(
          `❌ AUTO SCALP ENTRY rejected ${pair}: ${scalpEntry.status} / ${scalpEntry.reason}`
        );
        continue;
      }

      console.log(
        `✅ AUTO SCALP ENTRY READY ${pair} | 5M=${scalpEntry.trigger5m}`
      );

      const key =
        pair +
        result.signal.action +
        Number(levels.entry).toFixed(2);

      if (lastSignals[pair] === key)
        continue;

      lastSignals[pair] = key;

      addTrade({
        telegram_id: "VIP",
        pair: pair,
        action: result.signal.action,
        entry: levels.entry,
        stop_loss: levels.sl,
        target1: levels.tp1,
        target2: levels.tp2
      });

      const livePrice = Number(levels.entry);

// عرض منطقة الدخول حسب ATR
// قيمة ATR الحالية
const atr = Number(result.indicators.atr || 4);

// منطقة الدخول = 75% من ATR
let zone = atr * 0.75;

// أقل منطقة دخول 2 دولار
if (zone < 2) zone = 2;

// أكبر منطقة دخول 6 دولار
if (zone > 6) zone = 6;

let entryFrom;
let entryTo;

if (result.signal.action === "BUY") {

    entryFrom = livePrice;
    entryTo = livePrice + zone;

} else {

    entryFrom = livePrice - zone;
    entryTo = livePrice;

}
const message = `
🚨 إشارة ذهب جديدة

🥇 الزوج: ${pair}

📈 الاتجاه: ${result.signal.action}

📍 منطقة الدخول

${entryFrom.toFixed(2)} ➜ ${entryTo.toFixed(2)}

🛑 وقف الخسارة
${Number(levels.sl).toFixed(2)}

🎯 الهدف الأول
${Number(levels.tp1).toFixed(2)}

🎯 الهدف الثاني
${Number(levels.tp2).toFixed(2)}

🔥 الثقة
${result.signal.confidence}%

📊 ATR
${atr.toFixed(2)}

⚖️ العائد للمخاطرة
TP1 → 1:${levels.rrTp1}
TP2 → 1:${levels.rrTp2}

📏 مسافة وقف الخسارة
${Number(levels.riskDistance).toFixed(2)}
`;
const users = allUsers();

// إرسال لكل المستخدمين

for (const user of users) {
    try {

        await bot.telegram.sendMessage(
            user.telegram_id,
            message
        );

    } catch (e) {

        if (e.message.includes("USER_BOT_TO_BOT_DISABLED")) {
            console.log(
                `⚠️ Skipped bot account: ${user.telegram_id}`
            );
            continue;
        }

        console.log(
            `Send failed ${user.telegram_id}:`,
            e.message
        );
    }
}

// إرسال للجروب الرئيسي
try {
    await bot.telegram.sendMessage(
        config.mainGroupId,
        message
    );
} catch (e) {
    console.log("Group send error:", e.message);
}

// إرسال للأدمن إذا لم يكن موجودًا في قاعدة البيانات
for (const adminId of config.adminIds) {
    const exists = users.find(
        u => String(u.telegram_id) === String(adminId)
    );

    if (!exists) {
        try {
            await bot.telegram.sendMessage(adminId, message);
        } catch (e) {
            console.log(`Admin send failed ${adminId}:`, e.message);
        }
    }
}
              console.log("✅ Signal Sent:", pair);

        } catch (e) {
            console.log(pair, e.message);
        }
    }
console.log(
    `⏱️ SCAN DURATION: ${((Date.now() - scanStart) / 1000).toFixed(1)} seconds`
);
    console.log("✅ Market Scan Finished");
}

module.exports = { scanMarket };
