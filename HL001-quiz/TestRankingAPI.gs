// filename: TestRankingAPI.gs

/**
 * 期間別ランキングの動作確認用テスト
 */
function testGetRankingScopes() {
  var scopes = ['daily', 'weekly', 'monthly', 'yearly', 'all'];
  scopes.forEach(function (sc) {
    var res = getRanking(sc);
    Logger.log('\n=== ' + sc + ' ===');
    Logger.log(JSON.stringify({
      success: res && res.success,
      scope: res && res.scope,
      startDate: res && res.startDate,
      count: res && res.rankings ? res.rankings.length : 0
    }));
  });
}

/**
 * 期間起点の計算確認
 */
function testDateCalculation() {
  var now = new Date();
  Logger.log('now: ' + now);

  // weekly（月曜0時起点）
  var day = now.getDay();
  var daysToMonday = (day === 0) ? 6 : (day - 1);
  var weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  Logger.log('weekStart: ' + weekStart);

  // monthly（月初0時）
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  Logger.log('monthStart: ' + monthStart);

  // yearly（年初0時）
  var yearStart = new Date(now.getFullYear(), 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  Logger.log('yearStart: ' + yearStart);
}

/**
 * ご指定の名称のテスト関数（簡易）
 * weekly / monthly / yearly を順番に実行してログ出力します。
 */
function testGetRanking() {
  var scopes = ['weekly', 'monthly', 'yearly'];
  scopes.forEach(function (sc) {
    var res = getRanking(sc);
    Logger.log('\n=== ' + sc + ' ===');
    Logger.log(JSON.stringify({
      success: res && res.success,
      scope: res && res.scope,
      startDate: res && res.startDate,
      count: res && res.rankings ? res.rankings.length : 0
    }, null, 2));
  });
}
