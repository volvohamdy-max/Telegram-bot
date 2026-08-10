
const { getPrice } = require('./marketService');
const { getOpenTrades, updateTradeStatus } = require('../database/trades');
const { allUsers } = require('../database/users');
const { getCachedPrice, setPrice } = require('./priceCache');
const config = require('../config');

async function monitorTrades(bot) {
    const trades = getOpenTrades();

    console.log(
        "📋 OPEN TRADES:",
        JSON.stringify(trades, null, 2)
    );

    if (!trades || trades.length === 0) {
        console.log('🔎 No open trades.');
        return;
    }

    for (const trade of trades) {
        if (String(trade.pair).toUpperCase() !== 'XAUUSD') {
            continue;
        }

        try {
            let price = getCachedPrice('XAUUSD');

            if (price === null || price === undefined) {
                price = await getPrice('XAUUSD');
                setPrice('XAUUSD', price);
            }

            price = Number(price);

            if (!Number.isFinite(price)) {
                throw new Error('Invalid XAUUSD price');
            }

            console.log(
                `💰 Monitoring XAUUSD | Trade ${trade.id} | Price: ${price}`
            );

            let message = null;
            let newStatus = null;

            // =========================
            // BUY
            // =========================

            if (trade.action === 'BUY') {

                // TP2
                if (
                    trade.target2 != null &&
                    price >= Number(trade.target2)
                ) {
                    message = `🏆 تم تحقيق الهدف الثاني

🥇 الزوج: XAUUSD
📈 الاتجاه: BUY

💰 السعر الحالي:
${price}

🎯 الدخول:
${trade.entry}

🎯 TP1:
${trade.target1}

🏆 TP2:
${trade.target2}

✅ الصفقة حققت الهدف الثاني بنجاح 🎉`;

                    newStatus = 'closed';
                }

                // TP1
                else if (
                    trade.status === 'open' &&
                    trade.target1 != null &&
                    price >= Number(trade.target1)
                ) {
                    message = `🎯 تم تحقيق الهدف الأول

🥇 الزوج: XAUUSD
📈 الاتجاه: BUY

💰 السعر الحالي:
${price}

🎯 الدخول:
${trade.entry}

🎯 TP1:
${trade.target1}

⏳ في انتظار الهدف الثاني:
${trade.target2 || '-'}

✅ الصفقة في ربح 🎉`;

                    newStatus = 'target1';
                }

                // SL
                else if (
                    trade.stop_loss != null &&
                    price <= Number(trade.stop_loss)
                ) {
                    message = `❌ تم ضرب وقف الخسارة

🥇 الزوج: XAUUSD
📈 الاتجاه: BUY

💰 السعر الحالي:
${price}

🎯 الدخول:
${trade.entry}

🛑 وقف الخسارة:
${trade.stop_loss}

❌ انتهت الصفقة عند وقف الخسارة.`;

                    newStatus = 'closed';
                }
            }

            // =========================
            // SELL
            // =========================

            else if (trade.action === 'SELL') {

                // TP2
                if (
                    trade.target2 != null &&
                    price <= Number(trade.target2)
                ) {
                    message = `🏆 تم تحقيق الهدف الثاني

🥇 الزوج: XAUUSD
📉 الاتجاه: SELL

💰 السعر الحالي:
${price}

🎯 الدخول:
${trade.entry}

🎯 TP1:
${trade.target1}

🏆 TP2:
${trade.target2}

✅ الصفقة حققت الهدف الثاني بنجاح 🎉`;

                    newStatus = 'closed';
                }

                // TP1
                else if (
                    trade.status === 'open' &&
                    trade.target1 != null &&
                    price <= Number(trade.target1)
                ) {
                    message = `🎯 تم تحقيق الهدف الأول

🥇 الزوج: XAUUSD
📉 الاتجاه: SELL

💰 السعر الحالي:
${price}

🎯 الدخول:
${trade.entry}

🎯 TP1:
${trade.target1}

⏳ في انتظار الهدف الثاني:
${trade.target2 || '-'}

✅ الصفقة في ربح 🎉`;

                    newStatus = 'target1';
                }

                // SL
                else if (
                    trade.stop_loss != null &&
                    price >= Number(trade.stop_loss)
                ) {
                    message = `❌ تم ضرب وقف الخسارة

🥇 الزوج: XAUUSD
📉 الاتجاه: SELL

💰 السعر الحالي:
${price}

🎯 الدخول:
${trade.entry}

🛑 وقف الخسارة:
${trade.stop_loss}

❌ انتهت الصفقة عند وقف الخسارة.`;

                    newStatus = 'closed';
                }
            }

            console.log("🎯 TRADE CHECK:", {
                tradeId: trade.id,
                status: trade.status,
                action: trade.action,
                currentPrice: price,
                newStatus,
                hasMessage: !!message
            });

            // =========================
            // إرسال النتيجة
            // =========================

            if (message && newStatus) {

                updateTradeStatus(
                    trade.id,
                    newStatus
                );

                const users = allUsers({
                    vipOnly: true
                });

                // VIP
                for (const user of users) {
                    try {
                        await bot.telegram.sendMessage(
                            user.telegram_id,
                            message
                        );
                    } catch (e) {
                        console.log(
                            `Send failed ${user.telegram_id}:`,
                            e.message
                        );
                    }
                }

                // الجروب الرئيسي
                if (config.mainGroupId) {
                    try {
                        await bot.telegram.sendMessage(
                            config.mainGroupId,
                            message
                        );
                    } catch (e) {
                        console.log(
                            'Group result send error:',
                            e.message
                        );
                    }
                }

                // الأدمن
                for (const adminId of config.adminIds || []) {
                    try {
                        await bot.telegram.sendMessage(
                            adminId,
                            message
                        );
                    } catch (e) {
                        console.log(
                            `Admin result send failed ${adminId}:`,
                            e.message
                        );
                    }
                }

                console.log(
                    `✅ Result sent for trade ${trade.id}`
                );
            }

        } catch (err) {
            console.log(
                `❌ Trade monitor error: ${trade.pair}`,
                err.message
            );
        }
    }
}

module.exports = {
    monitorTrades
};

