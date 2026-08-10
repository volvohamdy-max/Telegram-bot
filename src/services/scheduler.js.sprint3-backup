const cron = require('node-cron');

const { expireVipUsers } = require('../database/users');
const { scanMarket } = require('./autoSignals');
const { monitorTrades } = require('./tradeMonitor');
const { runSmartScannerAlert } = require('./smartScannerAlert');

const {
    checkEconomicNews,
    checkUpcomingNews
} = require('./newsService');

let scanRunning = false;
let newsRunning = false;
let monitorRunning = false;

function startScheduler(bot) {

    console.log("⏰ Scheduler started");

    // =========================
    // الأخبار - كل 5 دقائق
    // =========================

    cron.schedule('*/5 * * * *', async () => {

        if (newsRunning) {
            console.log("⚠️ Previous news check still running");
            return;
        }

        newsRunning = true;

        console.log("📰 Checking economic news...");

        try {

            await checkEconomicNews(bot);
            await checkUpcomingNews(bot);

            console.log("✅ News check finished");

        } catch (err) {

            console.log(
                "❌ News error:",
                err.message
            );

        } finally {

            newsRunning = false;

        }

    });


    // =========================
    // VIP expiration - كل ساعة
    // =========================

    cron.schedule('5 * * * *', async () => {

        try {

            const expiredUsers = expireVipUsers();

            if (expiredUsers.length > 0) {

                console.log(
                    `✅ Expired VIP users: ${expiredUsers.length}`
                );

                for (const user of expiredUsers) {

                    try {

                        await bot.telegram.sendMessage(
                            user.telegram_id,
                            `⏰ انتهى اشتراك VIP الخاص بك.\n\nيمكنك التجديد من خلال:\n💎 /vip`
                        );

                    } catch (e) {

                        console.log(
                            "VIP message error:",
                            e.message
                        );

                    }

                }

            }

        } catch (err) {

            console.log(
                "❌ VIP expiration error:",
                err.message
            );

        }

    });


    // =========================
    // Market Scan - كل 5 دقائق
    // =========================

    cron.schedule('*/5 * * * *', async () => {

        if (scanRunning) {

            console.log(
                "⚠️ Previous market scan still running - skipped"
            );

            return;
        }

        scanRunning = true;

        const startTime = Date.now();

        console.log(
            "🚨 5-MIN MARKET SCAN TRIGGERED"
        );

        console.log(
            "🚀 SCAN START:",
            new Date().toLocaleTimeString()
        );

        try {

            await scanMarket(bot);

            const duration =
                ((Date.now() - startTime) / 1000).toFixed(1);

            console.log(
                `⏱️ SCAN DURATION: ${duration} seconds`
            );

            console.log(
                "✅ Market scan done"
            );

        } catch (err) {

            console.log(
                "❌ Scan error:",
                err.message
            );

        } finally {

            scanRunning = false;

        }

    });
// =========================
// Smart Scanner Auto Alert - كل 5 دقائق
// =========================

let smartAlertRunning = false;

cron.schedule('*/5 * * * *', async () => {

    if (smartAlertRunning) {
        console.log(
            '⚠️ Previous Smart Scanner Alert still running - skipped'
        );
        return;
    }

    smartAlertRunning = true;

    console.log(
        '🚨 SMART SCANNER AUTO ALERT TRIGGERED'
    );

    try {

        await runSmartScannerAlert(bot);

        console.log(
            '✅ Smart Scanner Alert finished'
        );

    } catch (err) {

        console.log(
            '❌ Smart Scanner Alert error:',
            err.message
        );

    } finally {

        smartAlertRunning = false;

    }

});

    // =========================
    // Trade Monitor - كل 15 ثانية
    // =========================

    cron.schedule('*/15 * * * * *', async () => {

        if (monitorRunning) {

            console.log(
                "⚠️ Previous trade monitor still running - skipped"
            );

            return;
        }

        monitorRunning = true;

        console.log(
            "🔎 Checking open trades..."
        );

        try {

            await monitorTrades(bot);

            console.log(
                "✅ Trade monitor finished"
            );

        } catch (err) {

            console.log(
                "❌ Trade monitor error:",
                err.message
            );

        } finally {

            monitorRunning = false;

        }

    });

}

module.exports = startScheduler;
