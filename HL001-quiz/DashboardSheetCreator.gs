// filename: DashboardSheetCreator.gs

/**
 * ダッシュボード用の5つのシートを自動作成
 * 1行目: 英語ヘッダー（コーディング用）
 * 2行目: 日本語ヘッダー（担当者確認用）
 * 3行目以降: データ
 */

/**
 * [メイン実行] 全シートを一括作成
 */
function createAllDashboardSheets() {
  Logger.log('=== ダッシュボードシート作成開始 ===\n');
  
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);
    Logger.log('✅ スプレッドシートを開きました: ' + ss.getName());
    Logger.log('URL: ' + ss.getUrl() + '\n');
    
    // デフォルトの「シート1」を削除（存在する場合）
    const defaultSheet = ss.getSheetByName('シート1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
      Logger.log('削除: デフォルトのシート1\n');
    }
    
    // 5つのシートを作成
    const results = [];
    
    Logger.log('STEP1: DASHBOARD_SUMMARY（全体サマリ）');
    results.push(createDashboardSummarySheet(ss));
    Utilities.sleep(1000);
    
    Logger.log('\nSTEP2: STORE_STATS（店舗別集計）');
    results.push(createStoreStatsSheet(ss));
    Utilities.sleep(1000);
    
    Logger.log('\nSTEP3: USER_ANALYTICS（個人別詳細）');
    results.push(createUserAnalyticsSheet(ss));
    Utilities.sleep(1000);
    
    Logger.log('\nSTEP4: QUESTION_ANALYSIS（問題別正答率）');
    results.push(createQuestionAnalysisSheet(ss));
    Utilities.sleep(1000);
    
    Logger.log('\nSTEP5: LOGIN_HISTORY（ログイン履歴）');
    results.push(createLoginHistorySheet(ss));
    
    Logger.log('\n=== ✅ 全シート作成完了 ===');
    Logger.log('作成されたシート:');
    results.forEach(r => Logger.log('  - ' + r.name));
    Logger.log('\nスプレッドシートを開いて確認してください:');
    Logger.log(ss.getUrl());
    
    return { success: true, sheets: results };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * シート作成のヘルパー関数
 */
function createSheetWithHeaders(ss, sheetName, headersEn, headersJa) {
  // 既存シートがあれば削除
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.deleteSheet(sheet);
    Logger.log(`  削除: 既存の${sheetName}シート`);
  }
  
  // 新規シート作成
  sheet = ss.insertSheet(sheetName);
  
  // 1行目: 英語ヘッダー
  sheet.getRange(1, 1, 1, headersEn.length).setValues([headersEn]);
  
  // 2行目: 日本語ヘッダー
  sheet.getRange(2, 1, 1, headersJa.length).setValues([headersJa]);
  
  // ヘッダーのスタイル設定
  const headerRange1 = sheet.getRange(1, 1, 1, headersEn.length);
  headerRange1.setFontWeight('bold');
  headerRange1.setBackground('#4a86e8');
  headerRange1.setFontColor('#ffffff');
  
  const headerRange2 = sheet.getRange(2, 1, 1, headersJa.length);
  headerRange2.setFontWeight('normal');
  headerRange2.setFontStyle('italic');
  headerRange2.setBackground('#c9daf8');
  
  // 列幅の自動調整
  for (let i = 1; i <= headersEn.length; i++) {
    sheet.autoResizeColumn(i);
  }
  
  // 固定行（ヘッダー2行を固定）
  sheet.setFrozenRows(2);
  
  Logger.log(`  ✅ 作成: ${sheetName}（${headersEn.length}列）`);
  return sheet;
}

/**
 * 1. DASHBOARD_SUMMARY（全体サマリ）
 */
function createDashboardSummarySheet(ss) {
  const headersEn = [
    'period', 'periodLabel', 'totalUsers', 'activeUsers', 'totalPlays',
    'dailyPlays', 'practicePlays', 'avgScore', 'avgAccuracy', 'avgTimeBonus',
    'uniqueLogins', 'updatedAt'
  ];
  
  const headersJa = [
    '期間', '期間表示', '総ユーザー数', 'アクティブユーザー数', '総プレイ回数',
    '本番プレイ回数', '練習プレイ回数', '平均スコア', '平均正答率', '平均タイムボーナス',
    'ユニークログイン数', '更新日時'
  ];
  
  const sheet = createSheetWithHeaders(ss, 'DASHBOARD_SUMMARY', headersEn, headersJa);
  
  // サンプルデータを1行追加（動作確認用）
  const sampleData = [
    'daily', '2025-10-09', 50, 12, 45, 30, 15, 8.2, 82.0, 15.5, 12, new Date()
  ];
  sheet.getRange(3, 1, 1, sampleData.length).setValues([sampleData]);
  
  return { name: 'DASHBOARD_SUMMARY', sheet: sheet };
}

/**
 * 2. STORE_STATS（店舗別集計）
 */
function createStoreStatsSheet(ss) {
  const headersEn = [
    'period', 'store', 'totalUsers', 'activeUsers', 'activeRate', 'totalPlays',
    'dailyPlays', 'practicePlays', 'avgScore', 'avgAccuracy', 'topScore',
    'topScorer', 'rank', 'updatedAt'
  ];
  
  const headersJa = [
    '期間', '所属', '総ユーザー数', 'アクティブユーザー数', 'アクティブ率', '総プレイ回数',
    '本番プレイ回数', '練習プレイ回数', '平均スコア', '平均正答率', '最高スコア',
    '最高得点者', '順位', '更新日時'
  ];
  
  const sheet = createSheetWithHeaders(ss, 'STORE_STATS', headersEn, headersJa);
  
  // サンプルデータを1行追加
  const sampleData = [
    'weekly', '渋谷店', 15, 12, 80.0, 89, 58, 31, 8.5, 85.0, 95, 'さくら', 1, new Date()
  ];
  sheet.getRange(3, 1, 1, sampleData.length).setValues([sampleData]);
  
  return { name: 'STORE_STATS', sheet: sheet };
}

/**
 * 3. USER_ANALYTICS（個人別詳細）
 */
function createUserAnalyticsSheet(ss) {
  const headersEn = [
    'period', 'rank', 'userId', 'name', 'store', 'role', 'employmentType',
    'totalPlays', 'dailyPlays', 'practicePlays', 'bestScore', 'avgScore',
    'avgAccuracy', 'avgTimeBonus', 'streak', 'lastPlayDate', 'storeRank', 'updatedAt'
  ];
  
  const headersJa = [
    '期間', '順位', 'ユーザーID', 'ユーザー名', '所属', '権限', '雇用形態',
    '総プレイ回数', '本番回数', '練習回数', '最高スコア', '平均スコア',
    '平均正答率', '平均タイムボーナス', '連続日数', '最終プレイ日', '所属内順位', '更新日時'
  ];
  
  const sheet = createSheetWithHeaders(ss, 'USER_ANALYTICS', headersEn, headersJa);
  
  // サンプルデータを1行追加
  const sampleData = [
    'weekly', 1, '001', 'さくら', '渋谷店', 'staff', '社員',
    12, 8, 4, 95, 8.5, 85.0, 15.5, 7, new Date(), 1, new Date()
  ];
  sheet.getRange(3, 1, 1, sampleData.length).setValues([sampleData]);
  
  return { name: 'USER_ANALYTICS', sheet: sheet };
}

/**
 * 4. QUESTION_ANALYSIS（問題別正答率）
 */
function createQuestionAnalysisSheet(ss) {
  const headersEn = [
    'period', 'questionId', 'productName', 'totalAttempts', 'correctCount',
    'incorrectCount', 'accuracyRate', 'avgHintsUsed', 'avgTimeSpent', 'rank', 'updatedAt'
  ];
  
  const headersJa = [
    '期間', '問題ID', '商品名', '出題回数', '正解数',
    '不正解数', '正答率', '平均ヒント使用数', '平均回答時間', '難易度ランク', '更新日時'
  ];
  
  const sheet = createSheetWithHeaders(ss, 'QUESTION_ANALYSIS', headersEn, headersJa);
  
  // サンプルデータを1行追加
  const sampleData = [
    'weekly', 'ckp', 'ちびこっぺぱん', 45, 38, 7, 84.4, 0.5, 12.3, 15, new Date()
  ];
  sheet.getRange(3, 1, 1, sampleData.length).setValues([sampleData]);
  
  return { name: 'QUESTION_ANALYSIS', sheet: sheet };
}

/**
 * 5. LOGIN_HISTORY（ログイン履歴）
 */
function createLoginHistorySheet(ss) {
  const headersEn = [
    'userId', 'name', 'loginDate', 'loginCount', 'firstLoginTime',
    'lastLoginTime', 'dailyPlays', 'practicePlays', 'updatedAt'
  ];
  
  const headersJa = [
    'ユーザーID', 'ユーザー名', 'ログイン日', 'ログイン回数', '初回ログイン時刻',
    '最終ログイン時刻', '本番プレイ回数', '練習プレイ回数', '更新日時'
  ];
  
  const sheet = createSheetWithHeaders(ss, 'LOGIN_HISTORY', headersEn, headersJa);
  
  // サンプルデータを2行追加
  const sampleData1 = [
    '001', 'さくら', new Date(), 3, new Date(), new Date(), 2, 1, new Date()
  ];
  const sampleData2 = [
    '002', 'あおい', new Date(), 1, new Date(), new Date(), 1, 0, new Date()
  ];
  sheet.getRange(3, 1, 2, sampleData1.length).setValues([sampleData1, sampleData2]);
  
  return { name: 'LOGIN_HISTORY', sheet: sheet };
}

/**
 * [テスト] シートが正しく作成されているか確認
 */
function testDashboardSheets() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);
    const sheets = ss.getSheets();
    
    Logger.log('=== ダッシュボードシート確認 ===');
    Logger.log(`スプレッドシート名: ${ss.getName()}`);
    Logger.log(`シート数: ${sheets.length}\n`);
    
    const expectedSheets = [
      'DASHBOARD_SUMMARY',
      'STORE_STATS',
      'USER_ANALYTICS',
      'QUESTION_ANALYSIS',
      'LOGIN_HISTORY'
    ];
    
    expectedSheets.forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) {
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        Logger.log(`✅ ${name}`);
        Logger.log(`   行数: ${lastRow}, 列数: ${lastCol}`);
        
        // ヘッダーを確認
        const headersEn = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const headersJa = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
        Logger.log(`   英語: ${headersEn.slice(0, 3).join(', ')}...`);
        Logger.log(`   日本語: ${headersJa.slice(0, 3).join(', ')}...\n`);
      } else {
        Logger.log(`❌ ${name} が見つかりません\n`);
      }
    });
    
    Logger.log('確認完了。スプレッドシートを開いて確認してください:');
    Logger.log(ss.getUrl());
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
  }
}

