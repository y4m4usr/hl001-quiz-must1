// filename: DebugSheetNames.gs

/**
 * [デバッグ] 各スプレッドシートのシート名を確認
 */
function debugSheetNames() {
  Logger.log('=== スプレッドシートのシート名確認 ===\n');
  
  try {
    // HISTORY
    Logger.log('1. HISTORY スプレッドシート');
    const histSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    Logger.log('   スプレッドシート名: ' + histSs.getName());
    const histSheets = histSs.getSheets();
    Logger.log('   シート数: ' + histSheets.length);
    histSheets.forEach((sheet, idx) => {
      Logger.log(`   ${idx + 1}. "${sheet.getName()}" (${sheet.getLastRow()}行)`);
    });

    // USERS
    Logger.log('\n2. USERS スプレッドシート');
    const usersSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    Logger.log('   スプレッドシート名: ' + usersSs.getName());
    const usersSheets = usersSs.getSheets();
    Logger.log('   シート数: ' + usersSheets.length);
    usersSheets.forEach((sheet, idx) => {
      Logger.log(`   ${idx + 1}. "${sheet.getName()}" (${sheet.getLastRow()}行)`);
    });

    // RANKINGS
    Logger.log('\n3. RANKINGS スプレッドシート');
    const rankSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.RANKINGS);
    Logger.log('   スプレッドシート名: ' + rankSs.getName());
    const rankSheets = rankSs.getSheets();
    Logger.log('   シート数: ' + rankSheets.length);
    rankSheets.forEach((sheet, idx) => {
      Logger.log(`   ${idx + 1}. "${sheet.getName()}" (${sheet.getLastRow()}行)`);
    });

    Logger.log('\n=== 確認完了 ===');
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
  }
}
