// filename: RankingAPI.gs

/**
 * ランキングデータを取得（上位N件、デフォルト3）
 * @param {number} limit
 * @return {Object}
 */
function getRankings(limit) {
  try {
    var n = Number(limit || 3);
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.RANKINGS);
    // 柔軟なシート名解決
    var sheet = ss.getSheetByName('rankings')
            || ss.getSheetByName('RANKINGS')
            || ss.getSheetByName('ランキング')
            || ss.getSheets()[0];
    if (!sheet) return { success: true, rankings: [], message: 'rankingsシートが見つかりません' };

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, rankings: [], message: 'まだランキングデータがありません' };
    }

    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      rows.push({
        userId: row[0],
        userName: row[1],
        store: row[2],
        avgScore: Number(row[3] || 0),
        avgAccuracy: Number(row[4] || 0),
        playCount: Number(row[5] || 0),
        lastPlayed: row[6]
      });
    }

    rows.sort(function(a, b){ return b.avgScore - a.avgScore; });
    var top = rows.slice(0, n);
    return { success: true, rankings: top, total: rows.length };
  } catch (error) {
    Logger.log('getRankings エラー: ' + error.message);
    return { success: false, message: 'ランキング取得に失敗しました', error: error.message };
  }
}

/**
 * 期間別ランキング（日/週/月/年/全期間）
 * @param {string} scope - 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'
 * @return {Object}
 */
function getRanking(scope) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    const sheet = ss.getSheetByName('history')
               || ss.getSheetByName('HISTORY')
               || ss.getSheetByName('quiz_history')
               || ss.getSheetByName('QUIZ_HISTORY')
               || ss.getSheets()[0];
    if (!sheet) throw new Error('HISTORY内の履歴シートが見つかりません');

    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return { success: true, rankings: [] };

    // フィルタ期間
    const now = new Date();
    const tz = 'Asia/Tokyo';
    let startDate;
    switch (String(scope || 'monthly')) {
      case 'daily': {
        // 当日0時（ローカル）
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'weekly': {
        // 直近の月曜0時（ローカル）
        const day = now.getDay(); // 0=Sun,1=Mon...
        const daysToMonday = (day === 0) ? 6 : (day - 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'yearly': {
        // 当年1月1日0時
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'all': {
        // 全期間
        startDate = new Date(0);
        break;
      }
      case 'monthly':
      default: {
        // 当月1日0時
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
    }

    // historyIdごとに集計（A:historyId, B:timestamp, C:userId, K:totalScore, L:metadata(JSON)）
    const map = {};
    values.slice(1).forEach(r => {
      const ts = new Date(r[1]);
      if (!(ts instanceof Date) || isNaN(ts)) return;
      if (ts < startDate) return;
      const hId = String(r[0] || '');
      const uid = String(r[2] || '');
      const totalScore = Number(r[10] || 0);
      const meta = (function(){ try { return JSON.parse(r[11] || '{}'); } catch(_) { return {}; } })();
      if (!hId || !uid) return;
      // 同一historyIdで複数行あるので、最大スコア（同一）の代表で上書き
      // UI 側の既存実装（accuracy*100）に合わせ、accuracy は 0..1 スケールで返す
      map[hId] = { userId: uid, totalScore: totalScore, accuracy: Number(meta.accuracy || 0) / 100, timeBonus: Number(meta.timeBonus || 0), timestamp: ts };
    });

    // ユーザーごとに最高スコアを抽出
    const best = {};
    Object.values(map).forEach(v => {
      const prev = best[v.userId];
      if (!prev || v.totalScore > prev.totalScore) best[v.userId] = v;
    });

    // USERS 情報
    const usersSh = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheetUsers = usersSh.getSheetByName('USERS') || usersSh.getSheetByName('users');
    const info = {};
    if (sheetUsers) {
      const uvals = sheetUsers.getDataRange().getValues();
      uvals.slice(1).forEach((row, i) => {
        info[String(row[0])] = { name: row[1], store: row[2], totalPractice: Number(row[6] || 0), rowIndex: i + 2 };
      });
    }

    const list = Object.keys(best).map(uid => {
      const b = best[uid];
      const u = info[uid] || {};
      return {
        userId: uid,
        name: u.name || uid,
        store: u.store || '',
        totalScore: b.totalScore,
        avgScore: b.totalScore, // フロントの既存表示互換（avgScore を参照）
        accuracy: b.accuracy,
        timeBonus: b.timeBonus,
        totalPractice: u.totalPractice || 0,
        rowIndex: u.rowIndex || 999,
        timestamp: b.timestamp
      };
    }).sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;       // 1. 総合得点
      if (b.totalPractice !== a.totalPractice) return b.totalPractice - a.totalPractice; // 2. 練習回数
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;               // 3. USERSの行番号
      return b.timeBonus - a.timeBonus;                                            // 4. タイムボーナス
    }).slice(0, 50);

    return {
      success: true,
      rankings: list,
      scope: String(scope || 'monthly'),
      startDate: Utilities.formatDate(startDate, tz, 'yyyy-MM-dd HH:mm:ss')
    };
  } catch (e) {
    Logger.log('getRanking エラー: ' + e.message);
    return { success: false, message: 'ランキング取得失敗', error: e.message };
  }
}

/**
 * 期間別ランキングを RANKINGS シートに書き込み
 * - 既存の 'rankings' タブにヘッダを含めて上書きします
 * - フォーマット: rank, userId, userName, store, totalScore, accuracy(%), timeBonus, lastPlayed, scope, startDate, generatedAt
 * @param {string} scope - 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'
 * @return {Object} {success, count, scope, startDate, message}
 */
function updateRankingsSheet(scope) {
  try {
    var result = getRanking(scope || 'monthly');
    if (!result || !result.success) {
      return { success: false, message: (result && result.message) || 'getRanking に失敗しました' };
    }

    var list = result.rankings || [];
    var rankingsSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.RANKINGS);
    var sheet = rankingsSs.getSheetByName('rankings') || rankingsSs.insertSheet('rankings');

    // 上書き
    sheet.clear();
    var headers = ['rank','userId','userName','store','totalScore','accuracy(%)','timeBonus','lastPlayed','scope','startDate','generatedAt'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    var tz = 'Asia/Tokyo';
    var generatedAt = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
    var rows = list.map(function(r, i){
      return [
        i + 1,
        r.userId || '',
        r.name || r.userName || '',
        r.store || '',
        Number((r.totalScore != null ? r.totalScore : r.avgScore) || 0),
        Math.round(((r.accuracy || 0) * 100)),
        Number(r.timeBonus || 0),
        r.timestamp ? Utilities.formatDate(new Date(r.timestamp), tz, 'yyyy-MM-dd HH:mm:ss') : '',
        String(result.scope || scope || 'monthly'),
        result.startDate || '',
        generatedAt
      ];
    });

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    try { sheet.autoResizeColumns(1, headers.length); } catch (e2) {}

    return {
      success: true,
      count: rows.length,
      scope: String(result.scope || scope || 'monthly'),
      startDate: result.startDate || '',
      message: rows.length + '件のランキングを書き込みました'
    };
  } catch (e) {
    Logger.log('updateRankingsSheet エラー: ' + e.message);
    return { success: false, message: '更新に失敗しました', error: e.message };
  }
}

/**
 * 週次・月次・年次のランキングを1枚のrankingsシートに縦連結で出力
 * - dailyは出力しない
 * - 既存のrankingsシート内容はヘッダ以外クリアして最新に置き換え
 */
function updateRankingsAllScopes() {
  try {
    var scopes = ['weekly', 'monthly', 'yearly'];
    var rankingsSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.RANKINGS);
    var sheet = rankingsSs.getSheetByName('rankings') || rankingsSs.insertSheet('rankings');

    // ヘッダ
    var headers = ['rank','userId','userName','store','totalScore','accuracy(%)','timeBonus','lastPlayed','scope','startDate','generatedAt'];
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    var tz = 'Asia/Tokyo';
    var allRows = [];

    scopes.forEach(function(sc){
      var result = getRanking(sc);
      if (!result || !result.success) return;
      var rows = (result.rankings || []).map(function(r, i){
        return [
          i + 1,
          r.userId || '',
          r.name || r.userName || '',
          r.store || '',
          Number((r.totalScore != null ? r.totalScore : r.avgScore) || 0),
          Math.round(((r.accuracy || 0) * 100)),
          Number(r.timeBonus || 0),
          r.timestamp ? Utilities.formatDate(new Date(r.timestamp), tz, 'yyyy-MM-dd HH:mm:ss') : '',
          String(result.scope || sc),
          result.startDate || '',
          Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss')
        ];
      });
      allRows = allRows.concat(rows);
    });

    if (allRows.length > 0) {
      sheet.getRange(2, 1, allRows.length, headers.length).setValues(allRows);
    }

    try { sheet.autoResizeColumns(1, headers.length); } catch(e) {}
    return { success: true, count: allRows.length };
  } catch (e) {
    Logger.log('updateRankingsAllScopes エラー: ' + e.message);
    return { success: false, message: '一括更新に失敗', error: e.message };
  }
}
