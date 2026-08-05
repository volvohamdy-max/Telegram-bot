const axios = require("axios");
const { allUsers } = require("../database/users");
const db = require("../database/db");
const { translateNews } = require("./newsTranslator");
const { analyzeNews } = require("../ai/newsAI");
const config = require("../config");

let newsCache = {
    data: [],
    time: 0
};

const CACHE_TIME = 15 * 60 * 1000;


// ===============================
// جلب التقويم الاقتصادي من EODHD
// ===============================

async function getEconomicCalendar(){

    try {

        const now = new Date();

        const from = now.toISOString().split("T")[0];

        const future = new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000
        );

        const to = future.toISOString().split("T")[0];


        // استخدام الكاش
        if(
            newsCache.data.length &&
            Date.now() - newsCache.time < CACHE_TIME
        ){
            return newsCache.data;
        }


        const url =
        `https://eodhd.com/api/economic-events`;


        const response = await axios.get(url,{
            params:{
                api_token: config.eodhdApiKey,
                from: from,
                to: to,
                fmt:"json"
            }
        });


        const data = response.data || [];


        newsCache = {
            data:data,
            time:Date.now()
        };


        return data;


    }catch(err){

        console.log(
            "Economic Calendar Error:",
            err.message
        );

        return [];

    }

}
// ===============================
// فلترة الأخبار القوية
// ===============================

function isHighImpact(news){

    const impact = String(
        news.impact || 
        news.Importance || 
        news.importance || 
        ""
    ).toLowerCase();


    return (
        impact.includes("high") ||
        impact === "3" ||
        impact === "3.0"
    );

}



// ===============================
// إرسال رسالة للمستخدمين
// ===============================

async function sendToUsers(bot, message){

    const users = allUsers();


    for(const user of users){

        try{

            await bot.telegram.sendMessage(
                user.telegram_id,
                message,
                {
                    parse_mode:"HTML"
                }
            );


        }catch(err){

            console.log(
                "Send news error:",
                err.message
            );

        }

    }

}



// ===============================
// إرسال خبر اقتصادي مهم
// ===============================

async function checkEconomicNews(bot){

    const news =
    await getEconomicCalendar();


    for(const item of news){


        if(!isHighImpact(item))
            continue;



        const newsId =
        item.id ||
        item.event_id ||
        item.title +
        item.date;



        const exists =
        db.prepare(
            "SELECT * FROM news_alerts WHERE news_id=?"
        ).get(String(newsId));



        if(exists)
            continue;



        db.prepare(
            "INSERT INTO news_alerts(news_id,alert_sent) VALUES(?,1)"
        )
        .run(String(newsId));



        const ai =
        await analyzeNews(
            item.event ||
            item.title ||
            ""
        );



        const message = `
🚨 <b>خبر اقتصادي قوي</b>

📰 ${translateNews(
    item.event ||
    item.title ||
    ""
)}

🌍 الدولة:
${item.country || "-"}

🔴 التأثير:
مرتفع

⏰ الموعد:
${item.date || "-"}


📉 السابق:
${item.previous || "-"}


📈 المتوقع:
${item.forecast || item.estimate || "-"}


🤖 تحليل AI:

${ai}


⚠️ قد يسبب حركة قوية في السوق

🤖 Forex AI Bot
`;



        await sendToUsers(
            bot,
            message
        );



        console.log(
            "Economic News Sent:",
            item.event
        );


    }

}
// ===============================
// تنبيه قبل الخبر بـ 15 دقيقة
// ===============================

async function checkUpcomingNews(bot){

    const news =
    await getEconomicCalendar();


    const now = new Date();


    for(const item of news){


        if(!isHighImpact(item))
            continue;



        const newsDate =
        new Date(
            item.date
        );


        const diff =
        (newsDate - now) / 1000 / 60;



        // قبل الخبر بـ 15 دقيقة
        if(diff > 14 && diff <= 16){


            const newsId =
            "upcoming_" +
            (
                item.id ||
                item.event_id ||
                item.title +
                item.date
            );



            const exists =
            db.prepare(
                "SELECT * FROM news_alerts WHERE news_id=?"
            )
            .get(newsId);



            if(exists)
                continue;



            db.prepare(
                "INSERT INTO news_alerts(news_id,alert_sent) VALUES(?,1)"
            )
            .run(newsId);



            const message = `

⚠️ <b>تنبيه خبر اقتصادي قريب</b>


📰 الخبر:

${translateNews(
    item.event ||
    item.title ||
    ""
)}


⏰ الموعد:

بعد حوالي 15 دقيقة


🔴 التأثير:

مرتفع


📊 العملات المتأثرة:

${item.currency || item.country || "USD"}


🟡 XAUUSD

⚠️ يفضل الحذر أثناء الخبر


🤖 Forex AI Bot

`;



            await sendToUsers(
                bot,
                message
            );



            console.log(
                "Upcoming news alert:",
                item.event
            );


        }


    }


}


// ===============================
// تصدير الدوال
// ===============================

module.exports = {
    checkEconomicNews,
    checkUpcomingNews,
    getEconomicCalendar
};
