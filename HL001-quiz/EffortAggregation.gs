// filename: EffortAggregation.gs

/**
 * 個人別努力度を集計して USER_EFFORT_STATS に書き込む
 * - HISTORY シートはスキーマ差異に耐性を持たせる（v11 形式/旧形式）
 * - USERS から氏名と所属を補完
 */
function aggregateUserEffort() {
  try {
    Logger.log('=== 努力度集計開始 ===');

    // HISTORY 取得（シート名に柔軟対応）
    var histSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    var histSheet = (function () {
      var candidates = ['history', 'HISTORY', 'quiz_history', 'QUIZ_HISTORY'];
      for (var i = 0; i < candidates.length; i++) {
        var s = histSs.getSheetByName(candidates[i]);
        if (s) return s;
      }
      return histSs.getSheets()[0];
    })();
    if (!histSheet) throw new Error('HISTORY内に対象シートが見つかりません');

    var histValues = histSheet.getDataRange().getValues();
    if (!histValues || histValues.length === 0) {
      Logger.log('HISTORY にデータがありません');
      return { success: true, count: 0 };
    }

    // ヘッダー有無判定（B列が日付型ならデータ開始、'timestamp'文字列ならヘッダ）
    var startRow = 0;
    var first = histValues[0] || [];
    var b0 = first[1];
    if (!(b0 instanceof Date) && typeof b0 === 'string' && b0.toLowerCase() === 'timestamp') {
      startRow = 1; // 1行目がヘッダ
    }

    // v11 判定: A=historyId 文字列、B=timestamp(date)、C=userId、D=mode、K=totalScore
    // 旧判定: A=timestamp(date)、B=userId、E=mode、F=score
    var sample = histValues[Math.min(startRow, histValues.length - 1)];
    var isV11 = false;
    if (sample && sample.length >= 12) {
      var a = sample[0];
      var b = sample[1];
      var c = sample[2];
      var d = sample[3];
      // historyId風、BがDate、CがユーザID文字列、Dがモード文字列
      if (typeof a === 'string' && (b instanceof Date) && (typeof c === 'string' || typeof c === 'number')) {
        isV11 = true;
      }
    }

    // USERS 情報（userId, name, store）
    var usersSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    var usersSheet = usersSs.getSheetByName('USERS') || usersSs.getSheetByName('users');
    var usersValues = usersSheet ? usersSheet.getDataRange().getValues() : [];
    var usersStart = usersValues.length > 2 ? 2 : 0; // 2行ヘッダー想定
    var usersMap = {};
    for (var i = usersStart; i < usersValues.length; i++) {
      var ur = usersValues[i];
      var uid = String(ur[0] || '');
      if (!uid) continue;
      usersMap[uid] = { name: ur[1] || '', store: ur[2] || '' };
    }

    // 集計（ユーザー別にattempt単位でカウント）
    var userStats = {}; // userId -> {totalAttempts, practiceAttempts, examAttempts, totalScore, lastAttemptDate}

    if (isV11) {
      // attempts: historyIdごとに代表行を1つに集約
      var attemptMap = {}; // historyId -> {userId, mode, totalScore, ts}
      for (var r = startRow; r < histValues.length; r++) {
        var row = histValues[r];
        var historyId = String(row[0] || '');
        var ts = new Date(row[1]);
        var uid = String(row[2] || '');
        var mode = String(row[3] || '');
        var totalScore = Number(row[10] || 0);
        if (!historyId || !uid || !(ts instanceof Date) || isNaN(ts)) continue;
        if (!attemptMap[historyId]) {
          attemptMap[historyId] = { userId: uid, mode: mode, totalScore: totalScore, ts: ts };
        }
      }
      Object.keys(attemptMap).forEach(function (hid) {
        var a = attemptMap[hid];
        var uid = a.userId;
        if (!userStats[uid]) userStats[uid] = { totalAttempts: 0, practiceAttempts: 0, examAttempts: 0, totalScore: 0, lastAttemptDate: null };
        userStats[uid].totalAttempts += 1;
        if (String(a.mode).toLowerCase() === 'practice') userStats[uid].practiceAttempts += 1; else userStats[uid].examAttempts += 1;
        userStats[uid].totalScore += Number(a.totalScore || 0);
        if (!userStats[uid].lastAttemptDate || a.ts > userStats[uid].lastAttemptDate) userStats[uid].lastAttemptDate = a.ts;
      });
    } else {
      // 旧形式: A:timestamp(Date), B:userId, E:mode, F:score
      for (var r2 = startRow; r2 < histValues.length; r2++) {
        var row2 = histValues[r2];
        var ts2 = new Date(row2[0]);
        var uid2 = String(row2[1] || '');
        var mode2 = String(row2[4] || 'exam');
        var score2 = Number(row2[5] || 0);
        if (!uid2 || !(ts2 instanceof Date) || isNaN(ts2)) continue;
        if (!userStats[uid2]) userStats[uid2] = { totalAttempts: 0, practiceAttempts: 0, examAttempts: 0, totalScore: 0, lastAttemptDate: null };
        userStats[uid2].totalAttempts += 1;
        if (String(mode2).toLowerCase() === 'practice') userStats[uid2].practiceAttempts += 1; else userStats[uid2].examAttempts += 1;
        userStats[uid2].totalScore += score2;
        if (!userStats[uid2].lastAttemptDate || ts2 > userStats[uid2].lastAttemptDate) userStats[uid2].lastAttemptDate = ts2;
      }
    }

    // DASHBOARD: USER_EFFORT_STATS に書き込み
    var dashSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);
    var effortSheet = dashSs.getSheetByName('USER_EFFORT_STATS');
    if (!effortSheet) {
      effortSheet = dashSs.insertSheet('USER_EFFORT_STATS');
      effortSheet.getRange(1, 1, 1, 8).setValues([[
        'employeeId', 'employeeName', 'store', 'totalAttempts', 'practiceAttempts', 'examAttempts', 'averageScore', 'lastAttemptDate'
      ]]);
      effortSheet.getRange(2, 1, 1, 8).setValues([[
        '社員番号', '氏名', '所属', '総受験回数', '練習回数', '本番回数', '平均スコア', '最終受験日'
      ]]);
      effortSheet.setFrozenRows(2);
    }

    // 3行目以降クリア
    if (effortSheet.getLastRow() > 2) {
      effortSheet.getRange(3, 1, effortSheet.getLastRow() - 2, 8).clearContent();
    }

    // 出力整形
    var output = [];
    Object.keys(userStats).forEach(function (uid) {
      var s = userStats[uid];
      var info = usersMap[uid];
      if (!info) return; // ユーザー情報なしはスキップ
      var avg = s.totalAttempts > 0 ? (s.totalScore / s.totalAttempts) : 0;
      output.push([
        uid,
        info.name,
        info.store,
        s.totalAttempts,
        s.practiceAttempts,
        s.examAttempts,
        Math.round(avg * 10) / 10,
        s.lastAttemptDate
      ]);
    });

    if (output.length > 0) {
      effortSheet.getRange(3, 1, output.length, 8).setValues(output);
    }

    Logger.log('=== 努力度集計完了: ' + output.length + '名 ===');
    return { success: true, count: output.length };
  } catch (e) {
    Logger.log('aggregateUserEffort error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 全ダッシュボードデータ更新（努力度を含む）
 */
function updateAllDashboardDataWithEffort() {
  try {
    aggregateUserEffort();
    Logger.log('全ダッシュボードデータ更新完了（努力度含む）');
  } catch (e) {
    Logger.log('updateAllDashboardDataWithEffort error: ' + e.message);
  }
}

