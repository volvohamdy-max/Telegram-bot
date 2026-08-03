# Telegram Forex AI Bot

بوت Telegram Forex AI منظم وخفيف للعمل على Termux باستخدام Node.js وTelegraf وSQLite.

> تنبيه: هذا المشروع تعليمي ولا يقدم نصائح مالية. يجب اختبار أي استراتيجية على حساب تجريبي قبل استخدامها.

## المميزات

- تسجيل المستخدمين تلقائيا عند `/start`.
- نظام إحالات ونقاط ومكافآت.
- خطط VIP شهرية وثلاثية وسنوية مع طلب اشتراك وإرسال إثبات دفع للأدمن.
- لوحة أدمن: إحصائيات، إضافة/حذف VIP، رسالة جماعية، إرسال إشارة.
- تحليل فوركس عبر مؤشرات RSI وMACD وEMA وATR وADX والدعم/المقاومة.
- خدمة جاهزة للتكامل مع OpenAI API لإنتاج BUY / SELL / WAIT مع دخول ووقف وأهداف وثقة وسبب.
- مهام مجدولة عبر node-cron لإنهاء VIP تلقائيا.

## التشغيل على Termux

```bash
pkg update && pkg upgrade
pkg install nodejs git python make clang
npm install
cp .env.example .env
nano .env
npm run doctor
npm run db:init
npm start
```

لو شغلت البوت يدويًا، استخدم أحد الأمرين من داخل مجلد المشروع:

```bash
npm start
# أو
node app.js
```

لا تنسخ ملف `src/app.js` إلى جذر المشروع؛ ملف `app.js` الموجود في الجذر يقوم بتشغيل `src/app.js` تلقائيًا حتى لا تظهر مشكلة `Cannot find module './database/init'`.

## لو البوت مش راضي يشتغل

نفذ الأمر التالي من داخل مجلد المشروع لمعرفة النواقص بسرعة:

```bash
npm run doctor
```

لو ظهرت رسالة `مكتبات Node.js ناقصة` فهذا يعني أن `npm install` لم يكتمل أو أنك لست داخل مجلد المشروع الصحيح. نفذ:

```bash
pkg install nodejs python make clang
npm install
npm start
```

لو ظهرت رسالة `BOT_TOKEN is required` افتح ملف `.env` وضع توكن البوت من BotFather في `BOT_TOKEN`.

## المتغيرات

راجع `.env.example` واضبط:

- `BOT_TOKEN`: توكن Telegram من BotFather.
- `ADMIN_IDS`: أرقام Telegram ID للأدمن مفصولة بفواصل.
- `BOT_USERNAME`: اسم البوت بدون @ لإنشاء روابط الإحالة.
- `OPENAI_API_KEY`: مفتاح OpenAI اختياري، وعند تركه فارغا يعمل تحليل محلي احتياطي.
- `DATABASE_PATH`: مسار قاعدة SQLite.
- `PAYMENT_INFO`: تعليمات الدفع التي تظهر للمستخدم.

## أوامر المستخدم

- `/start` بدء وتسجيل المستخدم.
- `/menu` القائمة الرئيسية.
- `/vip` عرض خطط VIP.
- `/ref` رابط الإحالة.
- `/analyze EURUSD` تحليل زوج عملات.

## أوامر الأدمن

- `/admin` لوحة الأدمن.
- `/addvip <telegram_id> <days>` تفعيل VIP.
- `/removevip <telegram_id>` حذف VIP.
- `/broadcast <message>` رسالة جماعية.
- `/signal <message>` إرسال إشارة لمستخدمي VIP.
