const { analyzePair } = require('./analysisService');
const { allUsers } = require('../database/users');
const { addTrade } = require('../database/trades');
const { getLivePrice } = require('./priceService');
const { saveSignal } = require('./signalCache');
const config = require('../config');
const PAIRS = [
  
  "XAUUSD"
];

let lastSignals = {};
const scanStart = Date.now();

console.log("🚀 SCAN START:", new Date().toLocaleTimeString());
async function scanMarket(bot) {
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
      saveSignal(pair, result);
      console.log("AI RESULT:", pair, result);

      if (!result.signal) continue;
if (
  result.signal.action !== "BUY" &&
  result.signal.action !== "SELL"
) continue;
      if (result.signal.confidence < 53) continue;

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
const livePrice = Number(result.signal.entry);

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
${result.signal.stopLoss}

🎯 الهدف الأول
${result.signal.targets[0]}

🎯 الهدف الثاني
${result.signal.targets[1] || "-"}

🔥 الثقة
${result.signal.confidence}%

📊 ATR
${atr.toFixed(2)}
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
