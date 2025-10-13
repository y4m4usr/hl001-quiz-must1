// filename: TestRankingWriter.gs

/**
 * [テスト] 月次ランキングをRANKINGSシートに書き込み
 */
function testUpdateRankingsSheet_Monthly() {
  Logger.log('=== Monthly Rankings Update Test ===');
  const result = updateRankingsSheet('monthly');
  Logger.log(JSON.stringify(result, null, 2));
  if (result.success) {
    Logger.log('\u2705 成功: ' + result.count + '件のデータを書き込みました');
  } else {
    Logger.log('\u274c 失敗: ' + (result.error || result.message));
  }
}

/**
 * [テスト] 週次ランキングをRANKINGSシートに書き込み
 */
function testUpdateRankingsSheet_Weekly() {
  Logger.log('=== Weekly Rankings Update Test ===');
  const result = updateRankingsSheet('weekly');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * [テスト] 年次ランキングをRANKINGSシートに書き込み
 */
function testUpdateRankingsSheet_Yearly() {
  Logger.log('=== Yearly Rankings Update Test ===');
  const result = updateRankingsSheet('yearly');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * [テスト] 全期間ランキングをRANKINGSシートに書き込み
 */
function testUpdateRankingsSheet_All() {
  Logger.log('=== All Time Rankings Update Test ===');
  const result = updateRankingsSheet('all');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * [デバッグ] 書き込み前後のデータ確認
 */
function debugRankingsSheetContent() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.RANKINGS);
  const sheet = ss.getSheetByName('rankings')
             || ss.getSheetByName('RANKINGS')
             || ss.getSheetByName('ランキング')
             || ss.getSheets()[0];
  if (!sheet) {
    Logger.log('\u274c rankingsシートが見つかりません');
    return;
  }
  const data = sheet.getDataRange().getValues();
  Logger.log('Total rows in RANKINGS sheet: ' + data.length);
  if (data.length > 0) {
    Logger.log('\nHeaders:');
    Logger.log((data[0] || []).join(' | '));
    Logger.log('\nFirst 5 data rows:');
    data.slice(1, 6).forEach(function(row, idx){
      Logger.log('Row ' + (idx + 2) + ': ' + row.join(' | '));
    });
  } else {
    Logger.log('シートは空です');
  }
}

/**
 * [デバッグ] RANKINGSスプレッドシートの実際のシート名を確認
 */
function debugRankingsSheetNames() {
  try {
    const RANKINGS_ID = CONFIG.SHEET_IDS.RANKINGS;
    const ss = SpreadsheetApp.openById(RANKINGS_ID);
    Logger.log('=== RANKINGSスプレッドシート情報 ===');
    Logger.log('スプレッドシート名: ' + ss.getName());
    Logger.log('URL: ' + ss.getUrl());

    const sheets = ss.getSheets();
    Logger.log('\n=== シート（タブ）一覧 ===');
    Logger.log('シート数: ' + sheets.length);
    sheets.forEach(function(sheet, idx){
      Logger.log('\n' + (idx + 1) + '. シート名: "' + sheet.getName() + '"');
      Logger.log('   行数: ' + sheet.getLastRow());
      Logger.log('   列数: ' + sheet.getLastColumn());
      if (sheet.getLastRow() > 0) {
        const data = sheet.getRange(1, 1, Math.min(5, sheet.getLastRow()), Math.min(10, sheet.getLastColumn())).getValues();
        Logger.log('   先頭行:');
        data.forEach(function(row, rIdx){
          Logger.log('     行' + (rIdx + 1) + ': ' + row.join(' | '));
        });
      }
    });
  } catch (e) {
    Logger.log('\u274c エラー: ' + e.message);
  }
}
