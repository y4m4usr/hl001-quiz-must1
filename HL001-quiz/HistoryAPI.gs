// filename: HistoryAPI.gs

/**
 * クイズ結果をHISTORYシートに保存
 * @param {Object} data - 保存するクイズデータ
 * @return {Object}
 */
function saveQuizHistory(data) {
  try {
    // 呼び出し側が {data: {...}} を渡すケースに対応
    var payload = (data && data.userId) ? data : (data && data.data) ? data.data : null;
    if (!payload) {
      throw new Error('不正なデータ形式です');
    }

    var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    var sheet = ss.getSheetByName('history')
             || ss.getSheetByName('HISTORY')
             || ss.getSheetByName('quiz_history')
             || ss.getSheetByName('QUIZ_HISTORY')
             || ss.getSheets()[0];
    if (!sheet) throw new Error('HISTORY内の履歴シートが見つかりません');

    var timestamp = new Date();
    var total = Number(payload.total || 0);
    var correct = Number(payload.correct || 0);
    var accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    sheet.appendRow([
      timestamp,                // A: timestamp
      String(payload.userId || ''),      // B: userId
      String(payload.userName || ''),    // C: userName
      String(payload.store || ''),       // D: store
      String(payload.mode || 'practice'),// E: mode
      Number(payload.score || 0),        // F: score
      correct,                           // G: correct
      total,                             // H: total
      accuracy,                          // I: accuracy
      Number(payload.totalHintsUsed || 0), // J: totalHintsUsed
      Number(payload.timeSec || 0)       // K: timeSec
    ]);

    // ランキング更新
    updateRankingsFromHistory(String(payload.userId || ''));

    return { success: true, message: '結果を保存しました' };
  } catch (error) {
    Logger.log('saveQuizHistory エラー: ' + error.message);
    return { success: false, message: 'データ保存に失敗しました', error: error.message };
  }
}

/**
 * v11互換: フロントから送られる結果を受け取り、既存フォーマットで保存
 * - 既存の saveQuizHistory に委譲してシート構造との整合性を保つ
 * @param {Object} data
 * @return {Object}
 */
function submitQuizAnswers(data) {
  try {
    // 受け取り形式のゆらぎに対応（オブジェクト/ラップ/JSON文字列）
    let payload = null;
    if (data) {
      if (typeof data === 'string') {
        try { payload = JSON.parse(data); } catch(_) { payload = null; }
      } else if (data.userId) {
        payload = data;
      } else if (data.data) {
        if (typeof data.data === 'string') {
          try { payload = JSON.parse(data.data); } catch(_) { payload = null; }
        } else {
          payload = data.data;
        }
      }
    }
    if (!payload || !payload.userId) throw new Error('不正なデータ形式です');

    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    const sheet = ss.getSheetByName('history')
                 || ss.getSheetByName('HISTORY')
                 || ss.getSheetByName('quiz_history')
                 || ss.getSheetByName('QUIZ_HISTORY')
                 || ss.getSheets()[0];
    if (!sheet) throw new Error('HISTORY内の履歴シートが見つかりません');

    const timestamp = new Date();
    const historyId = 'HIS_' + Utilities.formatDate(timestamp, 'Asia/Tokyo', 'yyyyMMdd_HHmmss') + '_' + String(payload.userId || '');

    const answers = Array.isArray(payload.answers) ? payload.answers : [];
    // 新仕様に基づく集計
    const totalQuestions = answers.length;
    var correctCount = 0;
    var hintBonus = 0; // 最大50点（正解かつヒント未使用=+5、ヒント1のみ=+2、ヒント2=+0）
    var sumSpareSeconds = 0; // 正解問題の(20 - timeSpent)の合計（下限0）→ 後で0..50へスケール
    answers.forEach(function(a){
      var isC = !!(a && (a.isCorrect === true || a.correct === true));
      if (isC) {
        correctCount++;
        var hu = Number(a && a.hintsUsed || 0);
        if (hu === 0) hintBonus += 5; else if (hu === 1) hintBonus += 2;
        var ts = Number(a && a.timeSpent || 0);
        var spare = Math.max(0, 20 - ts);
        sumSpareSeconds += spare;
      }
    });
    if (hintBonus > 50) hintBonus = 50;
    // 早解きボーナス（最大50点）: 正解問題の余り秒(20 - timeSpent)の合計を0..50にスケール
    // 合計余り秒は最大200（10問×20秒）。50点満点に合わせて 200/50 = 4 で割る。
    var timeBonus = Math.round(sumSpareSeconds / 4);
    if (timeBonus > 50) timeBonus = 50;
    var accuracyCalc = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    var totalScoreCalc = accuracyCalc + hintBonus + timeBonus;
    var metaAccuracy = Number(payload.accuracy != null ? payload.accuracy : accuracyCalc);
    var metaBonus = Number(payload.bonusPoints != null ? payload.bonusPoints : hintBonus);
    var metaTime = Number(payload.timeBonus != null ? payload.timeBonus : timeBonus);
    Logger.log('submitQuizAnswers received: user=' + String(payload.userId||'') + ', mode=' + String(payload.mode||'') + ', answers=' + answers.length);
    // 実獲得EXP/RP（streakブースト込み）を先に計算し、metadataに保存する
    var gain = null;
try {
  var usersSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
  var usersSheet = usersSs.getSheetByName('USERS') || usersSs.getSheetByName('users');
  var udata = usersSheet ? usersSheet.getDataRange().getValues() : [];
  var curLevel = 1, curPoints = 0, curStreak = 0, lastDaily = null;
  for (var ui=1; ui<udata.length; ui++) {
    if (String(udata[ui][0]) === String(payload.userId || '')) {
      curLevel = Number(udata[ui][3] || 1);
      curPoints = Number(udata[ui][4] || 0);
      curStreak = Number(udata[ui][5] || 0);
      lastDaily = udata[ui][8];
      break;
    }
  }
  var expEarned = 0, rpEarned = 0, boost = 1.0, newStreak = curStreak;
  if (String(payload.mode || 'practice') === 'daily') {
    var today0 = new Date(); today0.setHours(0,0,0,0);
    var prev = (lastDaily instanceof Date && !isNaN(lastDaily)) ? new Date(lastDaily) : null;
    if (prev) { prev.setHours(0,0,0,0); }
    if (!prev) newStreak = 1; else {
      var diffDays = Math.round((today0 - prev) / 86400000);
      if (diffDays === 0) newStreak = curStreak || 1; else if (diffDays === 1) newStreak = (curStreak || 0) + 1; else newStreak = 1;
    }
    if (newStreak <= 1) boost = 1.0; else if (newStreak >= 7) boost = 1.5; else boost = 1.0 + 0.1 * (newStreak - 1);
    expEarned = Math.round(Number(totalScoreCalc || 0) * boost);
    rpEarned = Number(totalScoreCalc || 0);
  } else {
    expEarned = Math.min(10, Math.round(Number(metaAccuracy || 0) / 10));
    rpEarned = 0;
  }
  function levelFromExp(total){
    var req=[0];
    for (var lv=2; lv<=30; lv++){ var inc = Math.round(Math.pow(lv-1,1.5)*100); req[lv]=req[lv-1]+inc; }
    var lvNow=1; for (var lv2=2; lv2<=30; lv2++){ if (total>=req[lv2]) lvNow=lv2; else break; } return lvNow;
  }
  var newPoints = curPoints + expEarned;
  var newLevel = levelFromExp(newPoints);
  gain = { expEarned: expEarned, rpEarned: rpEarned, streak: newStreak, boost: boost, level: newLevel, points: newPoints };
} catch (eGain) { try { Logger.log('gain-estimate err: ' + (eGain && eGain.message || eGain)); } catch(_){} }

answers.forEach((ans, idx) => {
      sheet.appendRow([
        historyId,                                 // A: historyId
        timestamp,                                 // B: timestamp
        String(payload.userId || ''),              // C: userId
        String(payload.mode || 'practice'),        // D: mode
        String(ans.questionId || 'Q' + (idx+1)),   // E: questionId
        String(ans.userAnswer || ans.selected || ''), // F: userAnswer
        ans.isCorrect ? true : false,              // G: isCorrect
        Number(ans.hintsUsed || 0),                // H: hintsUsed
        Number(ans.timeSpent || 0),                // I: timeSpent
        Number(ans.score || 0),                    // J: score（この行のスコア）
        Number(totalScoreCalc || 0),               // K: totalScore（セッション）
        JSON.stringify({                           // L: metadata(JSON)
          accuracy: metaAccuracy || 0,
          hintBonus: hintBonus || 0,
          timeBonus: timeBonus || 0,
          correctCount: correctCount || 0,
          expEarned: (gain && gain.expEarned) || 0,
          rpEarned: (gain && gain.rpEarned) || 0,
          streakAfter: (gain && gain.streak) || 0,
          boost: (gain && gain.boost) || 1,
          levelAfter: (gain && gain.level) || null,
          pointsAfter: (gain && gain.points) || null
        })
      ]);
    });

    // duplicate submit guard AFTER successful write
    try {
      var cache = CacheService.getScriptCache();
      var guardKey = 'submitGuard_' + String(payload.userId || '');
      cache.put(guardKey, '1', 10);
    } catch (eGuard2) {
      try { Logger.log('submitQuizAnswers guard set err: ' + eGuard2.message); } catch(_){ }
    }

    // USERSシートに累計回数/最終本番日を記録（存在すれば）
    try { updateUserPracticeCount(payload.userId, payload.mode); } catch (e2) { try{ Logger.log(e2.message || e2);}catch(_){}}
    // EXP/RP付与は上で実行済み（gain）。ここでは再実行しない。
    try { /* already awarded above */ } catch (e4) { }
    // ダッシュボード集計（USER_EFFORT_STATS）を即時更新
    try { if (typeof aggregateUserEffort === 'function') aggregateUserEffort(); } catch (eDash) { try{ Logger.log('aggregateUserEffort err: ' + (eDash && eDash.message || eDash)); }catch(_){}}

    // RANKINGS（新版）を更新（自己ベストのみ上書き）
    try {
      // ランキング更新用の最小ペイロードを組み立て（不足分は計算値）
      var rankPayload = {
        userId: String(payload.userId || ''),
        score: Number(totalScoreCalc || 0),
        accuracy: Number(metaAccuracy || 0),
        bonusPoints: Number(metaBonus || 0),
        timeBonus: Number(metaTime || 0)
      };
      // 経路統一のため、ここでは更新しない
      // if (rankPayload.userId) updateRankings(rankPayload);
    } catch (e3) { try{ Logger.log('updateRankings err: ' + (e3 && e3.message || e3)); }catch(_){}}

    // ランキングシート（RANKINGS）を即時再生成（デフォルト: monthly）
    try { if (typeof updateRankingsAllScopes === 'function') { updateRankingsAllScopes(); } else if (typeof updateRankingsSheet === 'function') { updateRankingsSheet('monthly'); } } catch (eRank) { try{ Logger.log('updateRankingsAllScopes err: ' + (eRank && eRank.message || eRank)); }catch(_){}}

    return { success: true, message: '結果を保存しました', historyId: historyId };
  } catch (e) {
    Logger.log('submitQuizAnswers エラー: ' + e.message);
    return { success: false, message: 'データ保存に失敗しました', error: e.message };
  }
}

function updateUserPracticeCount(userId, mode) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    // 既存は 'users' シート名のため両対応
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(userId)) {
        const currentPractice = Number(data[i][6] || 0); // G: totalPractice
        const currentDaily = Number(data[i][7] || 0);    // H: totalDaily
        if (String(mode || 'practice') === 'practice') {
          sheet.getRange(i + 1, 7).setValue(currentPractice + 1);
        } else {
          sheet.getRange(i + 1, 8).setValue(currentDaily + 1);
          sheet.getRange(i + 1, 9).setValue(new Date()); // I: lastDailyDate
        }
        break;
      }
    }
  } catch (error) {
    Logger.log('updateUserPracticeCount エラー: ' + error.message);
  }
}

/**
 * 新ルール: EXP/RP付与・連続日数・レベル更新
 * USERSシート: D:level, E:points(累計EXP), F:streak, G:totalPractice, H:totalDaily, I:lastDailyDate
 */
function awardExperienceAndRank(userId, mode, totalScore, accuracy) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    var sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    var today = new Date();
    today.setHours(0,0,0,0);

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(userId)) {
        var level = Number(data[i][3] || 1); // D
        var points = Number(data[i][4] || 0); // E
        var streak = Number(data[i][5] || 0); // F
        var lastDaily = data[i][8];           // I

        var expEarned = 0;
        var rpEarned = 0; // 現状は保存先なし（ランキングはhistoryから集計）

        if (String(mode) === 'daily') {
          // 連続日数更新
          var newStreak = 1;
          if (lastDaily instanceof Date && !isNaN(lastDaily)) {
            var prev = new Date(lastDaily); prev.setHours(0,0,0,0);
            var diffDays = Math.round((today - prev) / 86400000);
            if (diffDays === 0) newStreak = streak || 1; // 同日は維持
            else if (diffDays === 1) newStreak = (streak || 0) + 1;
            else newStreak = 1;
          }
          // 連続プレイブースト 2日=1.1, 3日=1.2, ... , 7日以上=1.5
          var boost;
          if (newStreak <= 1) boost = 1.0; else if (newStreak >= 7) boost = 1.5; else boost = 1.0 + 0.1 * (newStreak - 1);
          expEarned = Math.round(Number(totalScore || 0) * boost);
          rpEarned = Number(totalScore || 0);

          // 反映
          points += expEarned;
          streak = newStreak;
          sheet.getRange(i + 1, 9).setValue(today); // I: lastDailyDate
          sheet.getRange(i + 1, 8).setValue(Number(data[i][7] || 0) + 1); // H: totalDaily
        } else {
          // 練習: EXP = 正答率/10（最大10）
          var acc = Number(accuracy || 0);
          expEarned = Math.min(10, Math.round(acc / 10));
          points += expEarned;
          // totalPractice +1 は既存関数で実施済
        }

        // レベル: 累計EXPに応じた簡易式（最大30）。調整しやすいよう500刻み。
        // レベル: 非線形（Lv^1.5 * 100を逐次加算）による閾値を生成（1..30）
        function levelFromExp(total){
          var req = [0]; // 累計必要EXP, req[1]=0
          for (var lv = 2; lv <= 30; lv++) {
            var inc = Math.round(Math.pow(lv - 1, 1.5) * 100);
            req[lv] = req[lv - 1] + inc;
          }
          var lvNow = 1;
          for (var lv2 = 2; lv2 <= 30; lv2++) {
            if (total >= req[lv2]) lvNow = lv2; else break;
          }
          return lvNow;
        }
        var newLevel = levelFromExp(points);

        sheet.getRange(i + 1, 5).setValue(points); // E: points(累計EXP)
        sheet.getRange(i + 1, 6).setValue(streak); // F: streak
        if (newLevel !== level) sheet.getRange(i + 1, 4).setValue(newLevel); // D: level
        break;
      }
    }
  } catch (err) {
    try { Logger.log('awardExperienceAndRank error: ' + err.message); } catch(_) {}
  }
}

/**
 * RANKINGS（新版）更新
 * - 列: A userId, B userName, C store, D bestTotalScore, E bestAccuracy,
 *       F bestBonusPoints, G bestTimeBonus, H totalPractice, I totalDaily, J lastPlayed
 */
function updateRankings(payload) {
  try {
    if (!payload || !payload.userId) {
      try { Logger.log('updateRankings skip: invalid payload'); } catch (_){ }
      return;
    }
    var rankingsSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.RANKINGS);
    var rankingsSheet = rankingsSs.getSheetByName('rankings');
    if (!rankingsSheet) throw new Error('rankingsシートが見つかりません');

    var userId = payload.userId;
    var totalScore = Number(payload.score || 0);
    var accuracy = Number(payload.accuracy || 0);
    var bonusPoints = Number(payload.bonusPoints || 0);
    var timeBonus = Number(payload.timeBonus || 0);

    // USERSシートから追加情報取得
    var usersSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    var usersSheet = usersSs.getSheetByName('USERS') || usersSs.getSheetByName('users');
    var usersData = usersSheet ? usersSheet.getDataRange().getValues() : [];

    var userName = userId;
    var store = '';
    var totalPractice = 0;
    var totalDaily = 0;

    for (var i = 1; i < usersData.length; i++) {
      if (String(usersData[i][0]) === String(userId)) {
        userName = usersData[i][1];
        store = usersData[i][2];
        totalPractice = Number(usersData[i][6] || 0);
        totalDaily = Number(usersData[i][7] || 0);
        break;
      }
    }

    // 既存のランキングデータ取得
    var rankingsData = rankingsSheet.getDataRange().getValues();
    var rowIndex = -1;
    var currentBest = 0;

    for (var r = 1; r < rankingsData.length; r++) {
      if (String(rankingsData[r][0]) === String(userId)) {
        rowIndex = r + 1; // 1-based
        currentBest = Number(rankingsData[r][3] || 0); // D: bestTotalScore
        break;
      }
    }

    var rowData = [
      userId,
      userName,
      store,
      totalScore,
      accuracy,
      bonusPoints,
      timeBonus,
      totalPractice,
      totalDaily,
      new Date()
    ];

    // 自己ベスト更新時は全列上書き、未更新でも H～J を更新
    if (totalScore > currentBest) {
      if (rowIndex > 0) {
        rankingsSheet.getRange(rowIndex, 1, 1, 10).setValues([rowData]);
      } else {
        rankingsSheet.appendRow(rowData);
      }
    } else if (rowIndex > 0) {
      rankingsSheet.getRange(rowIndex, 8, 1, 3).setValues([[totalPractice, totalDaily, new Date()]]);
    }
  } catch (error) {
    try { Logger.log('updateRankings エラー: ' + error.message); } catch(_) {}
  }
}

/**
 * ランキングを更新（ユーザーの平均スコア/正答率など）
 * @param {string} userId
 */
function updateRankingsFromHistory(userId) {
  try {
    if (!userId) return;

    var historySs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    var historySheet = historySs.getSheetByName('history')
                   || historySs.getSheetByName('HISTORY')
                   || historySs.getSheetByName('quiz_history')
                   || historySs.getSheetByName('QUIZ_HISTORY')
                   || historySs.getSheets()[0];
    var rankingsSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.RANKINGS);
    var rankingsSheet = rankingsSs.getSheetByName('rankings');
    if (!historySheet || !rankingsSheet) throw new Error('シートが見つかりません');

    var historyData = historySheet.getDataRange().getValues();
    var userHistory = [];
    for (var i = 1; i < historyData.length; i++) {
      if (String(historyData[i][1]) === String(userId)) userHistory.push(historyData[i]); // B列 userId
    }
    if (userHistory.length === 0) return;

    var totalScore = 0, totalAcc = 0;
    for (var j = 0; j < userHistory.length; j++) {
      totalScore += Number(userHistory[j][5] || 0); // F score
      totalAcc += Number(userHistory[j][8] || 0);   // I accuracy
    }
    var avgScore = Math.round(totalScore / userHistory.length);
    var avgAccuracy = Math.round(totalAcc / userHistory.length);
    var playCount = userHistory.length;
    var lastPlayed = userHistory[userHistory.length - 1][0]; // A timestamp
    var userName = userHistory[0][2];
    var store = userHistory[0][3];

    var rankingsData = rankingsSheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var r = 1; r < rankingsData.length; r++) {
      if (String(rankingsData[r][0]) === String(userId)) { // A userId
        rowIndex = r + 1; // 1-based
        break;
      }
    }

    var rowData = [userId, userName, store, avgScore, avgAccuracy, playCount, lastPlayed];
    if (rowIndex > 0) {
      rankingsSheet.getRange(rowIndex, 1, 1, 7).setValues([rowData]);
    } else {
      rankingsSheet.appendRow(rowData);
    }
  } catch (error) {
    Logger.log('updateRankings エラー: ' + error.message);
  }
}


