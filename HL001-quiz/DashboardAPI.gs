// filename: DashboardAPI.gs

/**
 * ダッシュボード用データAPI
 * dashboard.html から呼び出される
 */
function getDashboardData() {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);

    // USER_EFFORT_STATS 読み取り
    var effortData = (function () {
      var sh = ss.getSheetByName('USER_EFFORT_STATS');
      if (!sh || sh.getLastRow() < 3) return [];
      var rows = sh.getRange(3, 1, sh.getLastRow() - 2, 8).getValues();
      return rows.map(function (r) {
        return {
          employeeId: r[0],
          employeeName: r[1],
          store: r[2],
          totalAttempts: Number(r[3] || 0),
          practiceAttempts: Number(r[4] || 0),
          examAttempts: Number(r[5] || 0),
          averageScore: Number(r[6] || 0),
          lastAttemptDate: r[7]
        };
      });
    })();

    // 店舗一覧
    var stores = (function () {
      var set = {};
      effortData.forEach(function (u) { if (u.store) set[u.store] = true; });
      return Object.keys(set);
    })();

    // 店舗別ランキング（指標ベースでクライアント側で並び替え想定）
    var storeRankings = (function () {
      var map = {};
      effortData.forEach(function (u) {
        var key = String(u.store || '');
        if (!map[key]) map[key] = [];
        map[key].push(u);
      });
      Object.keys(map).forEach(function (k) {
        map[k].sort(function (a, b) { return b.totalAttempts - a.totalAttempts; });
      });
      return map;
    })();

    return { effortData: effortData, storeRankings: storeRankings, stores: stores };
  } catch (error) {
    Logger.log('getDashboardData error: ' + error);
    return { effortData: [], storeRankings: {}, stores: [], error: String(error && error.message || error) };
  }
}

/**
 * 管理者用ダッシュボードのサマリーデータを取得
 * admin-dashboard.html から呼び出される
 * @param {string} period - 期間指定 ('daily', 'weekly', 'monthly', 'yearly', 'all')
 * @return {Object} - サマリーデータ
 */
function getDashboardSummary(period) {
  try {
    period = period || 'monthly';
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);

    // DASHBOARD_SUMMARY から該当期間のデータを取得
    var summaryData = (function() {
      var sh = ss.getSheetByName('DASHBOARD_SUMMARY');
      if (!sh || sh.getLastRow() < 3) return null;
      var rows = sh.getRange(3, 1, sh.getLastRow() - 2, 12).getValues();

      // 指定期間のデータを検索
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === period) {
          return {
            period: rows[i][0],
            periodLabel: rows[i][1],
            totalUsers: Number(rows[i][2] || 0),
            activeUsers: Number(rows[i][3] || 0),
            totalPlays: Number(rows[i][4] || 0),
            dailyPlays: Number(rows[i][5] || 0),
            practicePlays: Number(rows[i][6] || 0),
            avgScore: Number(rows[i][7] || 0),
            avgAccuracy: Number(rows[i][8] || 0),
            avgTimeBonus: Number(rows[i][9] || 0),
            uniqueLogins: Number(rows[i][10] || 0),
            updatedAt: rows[i][11]
          };
        }
      }
      return null;
    })();

    // STORE_STATS から該当期間のデータを取得
    var storeStats = (function() {
      var sh = ss.getSheetByName('STORE_STATS');
      if (!sh || sh.getLastRow() < 3) return [];
      var rows = sh.getRange(3, 1, sh.getLastRow() - 2, 14).getValues();

      return rows
        .filter(function(r) { return String(r[0]) === period; })
        .map(function(r) {
          return {
            period: r[0],
            store: r[1],
            totalUsers: Number(r[2] || 0),
            activeUsers: Number(r[3] || 0),
            activeRate: Number(r[4] || 0),
            totalPlays: Number(r[5] || 0),
            dailyPlays: Number(r[6] || 0),
            practicePlays: Number(r[7] || 0),
            avgScore: Number(r[8] || 0),
            avgAccuracy: Number(r[9] || 0),
            topScore: Number(r[10] || 0),
            topScorer: r[11],
            rank: Number(r[12] || 0),
            updatedAt: r[13]
          };
        });
    })();

    // USER_ANALYTICS から該当期間のデータを取得（上位20名）
    var userAnalytics = (function() {
      var sh = ss.getSheetByName('USER_ANALYTICS');
      if (!sh || sh.getLastRow() < 3) return [];
      var rows = sh.getRange(3, 1, sh.getLastRow() - 2, 18).getValues();

      return rows
        .filter(function(r) { return String(r[0]) === period; })
        .slice(0, 20)
        .map(function(r) {
          return {
            period: r[0],
            rank: Number(r[1] || 0),
            userId: r[2],
            name: r[3],
            store: r[4],
            role: r[5],
            employmentType: r[6],
            totalPlays: Number(r[7] || 0),
            dailyPlays: Number(r[8] || 0),
            practicePlays: Number(r[9] || 0),
            bestScore: Number(r[10] || 0),
            avgScore: Number(r[11] || 0),
            avgAccuracy: Number(r[12] || 0),
            avgTimeBonus: Number(r[13] || 0),
            streak: Number(r[14] || 0),
            lastPlayDate: r[15],
            storeRank: Number(r[16] || 0),
            updatedAt: r[17]
          };
        });
    })();

    // QUESTION_ANALYSIS から該当期間のデータを取得（難易度上位10問）
    var questionAnalysis = (function() {
      var sh = ss.getSheetByName('QUESTION_ANALYSIS');
      if (!sh || sh.getLastRow() < 3) return [];
      var rows = sh.getRange(3, 1, sh.getLastRow() - 2, 11).getValues();

      return rows
        .filter(function(r) { return String(r[0]) === period; })
        .slice(0, 10)
        .map(function(r) {
          return {
            period: r[0],
            questionId: r[1],
            productName: r[2],
            totalAttempts: Number(r[3] || 0),
            correctCount: Number(r[4] || 0),
            incorrectCount: Number(r[5] || 0),
            accuracyRate: Number(r[6] || 0),
            avgHintsUsed: Number(r[7] || 0),
            avgTimeSpent: Number(r[8] || 0),
            rank: Number(r[9] || 0),
            updatedAt: r[10]
          };
        });
    })();

    return {
      success: true,
      period: period,
      summary: summaryData,
      storeStats: storeStats,
      userAnalytics: userAnalytics,
      questionAnalysis: questionAnalysis
    };

  } catch (error) {
    Logger.log('getDashboardSummary error: ' + error);
    return {
      success: false,
      error: String(error && error.message || error),
      summary: null,
      storeStats: [],
      userAnalytics: [],
      questionAnalysis: []
    };
  }
}
