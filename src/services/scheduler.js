const cron = require('node-cron');

const { expireVipUsers, allUsers } = require('../database/users');
const { scanMarket } = require('./autoSignals');
const { monitorTrades } = require('./tradeMonitor');

const {
    checkEconomicNews,
    checkUpcomingNews
} = require("./newsService");


function startScheduler(bot) {


    // الأخبار كل دقيقة
    cron.schedule('*/1 * * * *', async () => {

        console.log("📰 Checking economic news...");

        try {

            await checkEconomicNews(bot);

            await checkUpcomingNews(bot);

        } catch(err){

            console.log(
                "News error:",
                err.message
            );

        }

    });



    // انتهاء اشتراكات VIP كل ساعة
    cron.schedule('5 * * * *', async () => {

        const expiredUsers = expireVipUsers();


        if(expiredUsers.length > 0){

            console.log(
                `✅ Expired VIP users: ${expiredUsers.length}`
            );


            for(const user of expiredUsers){

                try{

                    await bot.telegram.sendMessage(
                        user.telegram_id,
                        `⏰ انتهى اشتراك VIP الخاص بك.\n\nيمكنك التجديد من خلال:\n💎 /vip`
                    );

                }catch(e){

                    console.log(e.message);

                }

            }

        }

    });



    // إشارات التداول كل 15 دقيقة
    cron.schedule('*/15 * * * *', async () => {

        console.log("🔍 Starting market scan...");

        try{

            await scanMarket(bot);

            console.log("✅ Market scan done");


        }catch(err){

            console.log(
                "❌ Scan error:",
                err.message
            );

        }

    });



    // متابعة الصفقات كل دقيقة
    cron.schedule('*/1 * * * *', async () => {

        console.log("🔎 Checking open trades...");

        try{

            await monitorTrades(bot);

            console.log("✅ Trade monitor finished");


        }catch(err){

            console.log(
                "Trade monitor error:",
                err.message
            );

        }

    });


}


module.exports = startScheduler;
