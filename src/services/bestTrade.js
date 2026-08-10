const { scanMarkets } = require('./smartScanner');
const { analyzePair } = require('./analysisService');
const { runSignalLab } = require('./signalLab');
const { getCandles } = require('./marketService');

const MIN_FINAL_SCORE = 60;
const MIN_SMART_SCORE = 55;
const MIN_AI_CONFIDENCE = 60;

// =====================================================
// حساب Entry / TP / SL
// =====================================================

function calculateTradeLevels(candles, direction) {
    if (!Array.isArray(candles) || candles.length < 10) {
        return null;
    }

    const entry = Number(candles[candles.length - 1].close);

    if (!Number.isFinite(entry)) {
        return null;
    }

    const previous = candles.slice(-10);

    const ranges = previous
        .map(c => Number(c.high) - Number(c.low))
        .filter(Number.isFinite)
        .filter(value => value > 0);

    if (ranges.length < 5) {
        return null;
    }

    const avgRange =
        ranges.reduce((sum, value) => sum + value, 0) /
        ranges.length;

    if (!Number.isFinite(avgRange) || avgRange <= 0) {
        return null;
    }

    const tp1Distance = avgRange * 1.0;
    const tp2Distance = avgRange * 1.8;
    const slDistance = avgRange * 1.0;

    let tp1;
    let tp2;
    let sl;

    if (direction === 'BUY') {
        tp1 = entry + tp1Distance;
        tp2 = entry + tp2Distance;
        sl = entry - slDistance;
    } else if (direction === 'SELL') {
        tp1 = entry - tp1Distance;
        tp2 = entry - tp2Distance;
        sl = entry + slDistance;
    } else {
        return null;
    }

    return {
        entry,
        tp1,
        tp2,
        sl,
        avgRange
    };
}


// =====================================================
// قوة الصفقة
// =====================================================

function getStrength(score) {
    if (score >= 85) {
        return 'قوية جدًا';
    }

    if (score >= 75) {
        return 'قوية';
    }

    if (score >= 65) {
        return 'متوسطة';
    }

    if (score >= 60) {
        return 'مقبولة';
    }

    return 'ضعيفة';
}


// =====================================================
// أفضل صفقة
// =====================================================

async function getBestTrade() {

    console.log('🎯 BEST TRADE SCAN STARTED');

    let markets;

    try {
        markets = await scanMarkets();
    } catch (error) {

        console.log(
            '❌ Smart Scanner error:',
            error.message
        );

        return null;
    }

    if (
        !Array.isArray(markets) ||
        markets.length === 0
    ) {

        console.log(
            '🟡 Smart Scanner returned no candidates'
        );

        return null;
    }


    // =================================================
    // المرشحون BUY / SELL فقط
    // =================================================

    const candidates = markets
        .filter(item =>
            item &&
            (
                item.action === 'BUY' ||
                item.action === 'SELL'
            )
        )
        .sort(
            (a, b) =>
                Number(b.score || 0) -
                Number(a.score || 0)
        );


    if (candidates.length === 0) {

        console.log(
            '🟡 No BUY/SELL candidates'
        );

        return null;
    }


    const results = [];


    // =================================================
    // تحليل كل مرشح
    // =================================================

    for (const candidate of candidates) {

        try {

            console.log(
                `🎯 BEST TRADE CHECK: ${candidate.pair} ${candidate.action}`
            );


            // =============================================
            // التحليل الكامل
            // =============================================

            const analysis =
                await analyzePair(candidate.pair);


            if (
                !analysis ||
                !analysis.indicators
            ) {

                console.log(
                    `⚠️ No indicators for ${candidate.pair}`
                );

                continue;
            }


            const indicators =
                analysis.indicators;


            const scannerDirection =
                candidate.action;


            // =============================================
            // Smart Score
            // =============================================

            const smartScore =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(candidate.score) || 0
                    )
                );


            if (
                smartScore <
                MIN_SMART_SCORE
            ) {

                console.log(
                    `🟡 Smart Score too low: ${candidate.pair} ${smartScore}`
                );

                continue;
            }


            // =============================================
            // AI
            // =============================================

            let aiConfidence = 0;
            let aiDirection = null;


            if (
                analysis.signal &&
                (
                    analysis.signal.action === 'BUY' ||
                    analysis.signal.action === 'SELL'
                )
            ) {

                aiDirection =
                    analysis.signal.action;


                const confidence =
                    Number(
                        analysis.signal.confidence
                    );


                if (
                    Number.isFinite(confidence)
                ) {

                    aiConfidence =
                        Math.max(
                            0,
                            Math.min(
                                100,
                                Math.round(confidence)
                            )
                        );
                }
            }


            console.log(
                `🤖 ${candidate.pair} Scanner=${scannerDirection} AI=${aiDirection || 'NONE'} Confidence=${aiConfidence}%`
            );


            // =============================================
            // لو AI موجود لكنه خالف الاتجاه
            // =============================================

            if (
                aiDirection &&
                aiDirection !== scannerDirection
            ) {

                console.log(
                    `❌ AI direction mismatch: ${candidate.pair}`
                );

                continue;
            }


            // =============================================
            // لو AI موجود وثقته ضعيفة
            // =============================================

            if (
                aiDirection &&
                aiConfidence > 0 &&
                aiConfidence < MIN_AI_CONFIDENCE
            ) {

                console.log(
                    `⚠️ Low AI confidence: ${candidate.pair} ${aiConfidence}%`
                );

                continue;
            }


            // =============================================
            // الاتجاه النهائي
            // =============================================

            const direction =
                aiDirection ||
                scannerDirection;


            if (
                direction !== 'BUY' &&
                direction !== 'SELL'
            ) {

                continue;
            }


            // =============================================
            // Signal Lab
            // =============================================

            let lab = null;


            try {

                lab =
                    await runSignalLab(
                        candidate.pair,
                        indicators,
                        direction
                    );

            } catch (error) {

                console.log(
                    `⚠️ Signal Lab skipped ${candidate.pair}:`,
                    error.message
                );

                lab = null;
            }


            // =============================================
            // بيانات التاريخ
            // =============================================

            const historicalScore =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            lab?.historicalScore
                        ) || 0
                    )
                );


            const similarSetups =
                Math.max(
                    0,
                    Number(
                        lab?.similarSetups
                    ) || 0
                );


            const tp1Rate =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            lab?.tp1Rate
                        ) || 0
                    )
                );


            const tp2Rate =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            lab?.tp2Rate
                        ) || 0
                    )
                );


            const slRate =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            lab?.slRate
                        ) || 0
                    )
                );


            const labApproved =
                Boolean(
                    lab?.approved
                );


            // =============================================
            // Final Score
            //
            // لو AI موجود:
            // Smart 50%
            // AI 30%
            // Historical 20%
            //
            // لو مفيش Historical:
            // لا نعاقب الصفقة
            // =============================================

            let finalScore =
                smartScore * 0.50;


            if (
                aiConfidence > 0
            ) {

                finalScore +=
                    aiConfidence * 0.30;

            } else {

                // نعطي الجزء غير المستخدم
                // للـ Smart Score
                finalScore +=
                    smartScore * 0.30;
            }


            if (
                similarSetups > 0
            ) {

                finalScore +=
                    historicalScore * 0.20;


                // Historical quality bonus
                if (
                    tp1Rate >= 60 &&
                    slRate <= 40
                ) {

                    finalScore += 5;
                }


                if (
                    labApproved
                ) {

                    finalScore += 5;
                }


                // Historical risk penalty
                if (
                    slRate > 50
                ) {

                    finalScore -= 10;
                }

            } else {

                console.log(
                    `ℹ️ ${candidate.pair}: no historical data, using technical + AI`
                );
            }


            // =============================================
            // تحديد الحد النهائي
            // =============================================

            finalScore =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(
                            finalScore
                        )
                    )
                );


            // =============================================
            // Entry / TP / SL
            // =============================================

            let candles;

            try {

                candles =
                    await getCandles(
                        candidate.pair
                    );

            } catch (error) {

                console.log(
                    `⚠️ Candle error ${candidate.pair}:`,
                    error.message
                );

                continue;
            }


            const levels =
                calculateTradeLevels(
                    candles,
                    direction
                );


            if (!levels) {

                console.log(
                    `⚠️ Cannot calculate trade levels: ${candidate.pair}`
                );

                continue;
            }


            // =============================================
            // قوة الصفقة
            // =============================================

            const strength =
                getStrength(
                    finalScore
                );


            // =============================================
            // النتيجة
            // =============================================

            results.push({

                pair:
                    candidate.pair,

                action:
                    direction,

                smartScore,

                confidence:
                    aiConfidence,

                historicalScore,

                similarSetups,

                tp1Rate,

                tp2Rate,

                slRate,

                approved:
                    labApproved,

                finalScore,

                strength,

                entry:
                    levels.entry,

                tp1:
                    levels.tp1,

                tp2:
                    levels.tp2,

                sl:
                    levels.sl,

                avgRange:
                    levels.avgRange,

                indicators
            });


            console.log(
                `✅ BEST TRADE CANDIDATE ${candidate.pair}:`,
                {
                    direction,
                    smartScore,
                    aiConfidence,
                    historicalScore,
                    similarSetups,
                    finalScore,
                    entry: levels.entry,
                    tp1: levels.tp1,
                    tp2: levels.tp2,
                    sl: levels.sl
                }
            );


        } catch (error) {

            console.log(
                `❌ Best Trade error ${candidate.pair}:`,
                error.message
            );
        }
    }


    // =====================================================
    // لا توجد نتائج
    // =====================================================

    if (
        results.length === 0
    ) {

        console.log(
            '🟡 No analyzable candidates'
        );

        return null;
    }


    // =====================================================
    // ترتيب الصفقات
    //
    // الأولوية:
    // 1- Final Score
    // 2- AI Confidence
    // 3- Historical Score
    // =====================================================

    results.sort(
        (a, b) => {

            if (
                b.finalScore !==
                a.finalScore
            ) {

                return (
                    b.finalScore -
                    a.finalScore
                );
            }


            if (
                b.confidence !==
                a.confidence
            ) {

                return (
                    b.confidence -
                    a.confidence
                );
            }


            return (
                b.historicalScore -
                a.historicalScore
            );
        }
    );


    // =====================================================
    // أفضل صفقة
    // =====================================================

    const best =
        results[0];


    console.log(
        '🏆 BEST TRADE SELECTED:',
        {
            pair: best.pair,
            action: best.action,
            finalScore: best.finalScore,
            smartScore: best.smartScore,
            aiConfidence: best.confidence,
            historicalScore: best.historicalScore
        }
    );


    // =====================================================
    // فلتر نهائي
    // =====================================================

    if (
        best.finalScore <
        MIN_FINAL_SCORE
    ) {

        console.log(
            `🟡 Market too weak: ${best.pair}`,
            {
                smartScore:
                    best.smartScore,

                aiConfidence:
                    best.confidence,

                historicalScore:
                    best.historicalScore,

                similarSetups:
                    best.similarSetups,

                finalScore:
                    best.finalScore
            }
        );


        return null;
    }


    return best;
}


module.exports = {
    getBestTrade
};
