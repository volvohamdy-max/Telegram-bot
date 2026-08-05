const { getPrice } = require('./marketService');
const { getOpenTrades, updateTradeStatus } = require('../database/trades');
const { allUsers } = require('../database/users');
const { getCachedPrice, setPrice } = require('./priceCache');

async function monitorTrades(bot) {

  const trades = getOpenTrades();

  for (const trade of trades) {

    try {

      let price = getCachedPrice(trade.pair);

if (!price) {
    price = await getPrice(trade.pair);
    setPrice(trade.pair, price);
}

      let message = null;
      let newStatus = null;


      if (trade.action === "BUY") {


        if (trade.target2 && price >= trade.target2) {

          message = `
🏆 تم تحقيق الهدف الثاني

📊 الزوج: ${trade.pair}
📈 الاتجاه: BUY
💰 السعر الحالي: ${price}

✅ TP2 وصل
`;

          newStatus = "target2";


        } else if (price >= trade.target1) {

          message = `
🎯 تم تحقيق الهدف الأول

📊 الزوج: ${trade.pair}
📈 الاتجاه: BUY
💰 السعر الحالي: ${price}

✅ TP1 وصل
`;

          newStatus = "target1";


        } else if (price <= trade.stop_loss) {

          message = `
❌ ضرب وقف الخسارة

📊 الزوج: ${trade.pair}
📈 الاتجاه: BUY
💰 السعر الحالي: ${price}

🛑 Stop Loss
`;

          newStatus = "stop";
        }



      } else if (trade.action === "SELL") {


        if (trade.target2 && price <= trade.target2) {

          message = `
🏆 تم تحقيق الهدف الثاني

📊 الزوج: ${trade.pair}
📉 الاتجاه: SELL
💰 السعر الحالي: ${price}

✅ TP2 وصل
`;

          newStatus = "target2";


        } else if (price <= trade.target1) {

          message = `
🎯 تم تحقيق الهدف الأول

📊 الزوج: ${trade.pair}
📉 الاتجاه: SELL
💰 السعر الحالي: ${price}

✅ TP1 وصل
`;

          newStatus = "target1";


        } else if (price >= trade.stop_loss) {

          message = `
❌ ضرب وقف الخسارة

📊 الزوج: ${trade.pair}
📉 الاتجاه: SELL
💰 السعر الحالي: ${price}

🛑 Stop Loss
`;

          newStatus = "stop";
        }

      }



      if (message) {

        updateTradeStatus(trade.id, newStatus);


        const users = allUsers({ vipOnly: true });


        for (const user of users) {

          try {

            await bot.telegram.sendMessage(
              user.telegram_id,
              message
            );

          } catch(e) {

            console.log(e.message);

          }

        }

      }


    } catch(err) {

      console.log(
        "Trade monitor error:",
        trade.pair,
        err.message
      );

    }

  }

}


module.exports = { monitorTrades };
