// filename: Titles.gs

/**
 * TITLES シートのレベル称号を取得
 * - USERS と同一スプレッドシート内の 'TITLES' シートを参照
 * - [level, title] の表を想定。最も近い「レベル以下」の称号を返す
 */
function getTitleForLevel(level) {
  try {
    level = Number(level || 1);
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    var sh = ss.getSheetByName('TITLES');
    if (!sh) return '';
    var values = sh.getDataRange().getValues();
    // ヘッダ2行想定（なくても耐える）
    var start = values.length > 1 && String(values[0][0]).toLowerCase() === 'level' ? 1 : 0;
    var best = '';
    var bestLv = -1;
    for (var i = start; i < values.length; i++) {
      var lv = Number(values[i][0] || 0);
      var title = String(values[i][1] || '');
      if (!lv || !title) continue;
      if (lv <= level && lv >= bestLv) { bestLv = lv; best = title; }
    }
    return best;
  } catch (e) {
    try { Logger.log('getTitleForLevel error: ' + e.message); } catch(_) {}
    return '';
  }
}

/**
 * TITLES シートを作成（なければ）し、デフォルトの称号を流し込む
 */
function ensureDefaultTitlesSheet() {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    var sh = ss.getSheetByName('TITLES');
    if (!sh) sh = ss.insertSheet('TITLES');
    sh.clear();
    var headers = [['level','title'], ['レベル','称号']];
    var rows = [
      [1,  'カラコンルーキー'],
      [5,  'レンズエキスパート'],
      [10, 'カラーマイスター'],
      [20, 'マスターオブコンタクト'],
      [30, '伝説のカラコンクイーン']
    ];
    sh.getRange(1,1,headers.length,2).setValues(headers);
    sh.getRange(3,1,rows.length,2).setValues(rows);
    try { sh.autoResizeColumns(1,2); } catch(_){ }
    return { success: true, count: rows.length };
  } catch (e) {
    try { Logger.log('ensureDefaultTitlesSheet error: ' + e.message); } catch(_) {}
    return { success: false, error: e.message };
  }
}

