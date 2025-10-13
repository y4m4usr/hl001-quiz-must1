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
