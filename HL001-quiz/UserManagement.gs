// filename: UserManagement.gs

/**
 * 既存USERSシートに新列を追加（初回のみ実行）
 * 
 * [スプレッドシート構造]
 * 1行目: 英語項目名（コーディング用）
 * 2行目: 日本語項目名（担当者確認用）
 * 3行目以降: 実データ
 * 
 * [追加する列]
 * J列: role（管理権限）
 * K列: employmentType（雇用形態）※department削除
 * L列: weeklyWorkDays（週間勤務日数）
 * M列: firstLoginDate（初ログイン日時）
 * N列: favoriteProduct（推しカラコン）
 * O列: comment（ひとことコメント）
 * P列: avatarUrl（登録用顔写真URL）
 */
function addColumnsToUsersSheet() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    
    if (!sheet) throw new Error('USERSシートが見つかりません');
    
    // 既存の列数を確認
    const lastCol = sheet.getLastColumn();
    Logger.log(`現在の列数: ${lastCol}`);
    
    // J列（10列目）以降に新ヘッダーを追加（department削除）
    const newHeadersEn = [
      'role',              // J列: 管理権限
      'employmentType',    // K列: 雇用形態
      'weeklyWorkDays',    // L列: 週間勤務日数
      'firstLoginDate',    // M列: 初ログイン日時
      'favoriteProduct',   // N列: 推しカラコン
      'comment',           // O列: ひとことコメント
      'avatarUrl'          // P列: 顔写真URL
    ];
    
    // 日本語ヘッダー（2行目）
    const newHeadersJa = [
      '管理権限',
      '雇用形態',
      '週間勤務日数',
      '初ログイン日時',
      '推しカラコン',
      'ひとことコメント',
      '顔写真URL'
    ];
    
    const startCol = 10; // J列
    
    // 1行目: 英語ヘッダー
    newHeadersEn.forEach((header, idx) => {
      sheet.getRange(1, startCol + idx).setValue(header);
    });
    
    // 2行目: 日本語ヘッダー
    newHeadersJa.forEach((header, idx) => {
      sheet.getRange(2, startCol + idx).setValue(header);
    });
    
    // ヘッダーのスタイル設定
    const headerRange1 = sheet.getRange(1, startCol, 1, newHeadersEn.length);
    headerRange1.setFontWeight('bold');
    headerRange1.setBackground('#d9ead3');
    
    const headerRange2 = sheet.getRange(2, startCol, 1, newHeadersEn.length);
    headerRange2.setFontWeight('normal');
    headerRange2.setFontStyle('italic');
    headerRange2.setBackground('#f3f3f3');
    
    // 列幅の自動調整
    for (let i = 0; i < newHeadersEn.length; i++) {
      sheet.autoResizeColumn(startCol + i);
    }
    
    Logger.log('✅ 新列の追加が完了しました');
    Logger.log(`追加した列: ${newHeadersEn.join(', ')}`);
    return { success: true, message: '新列を追加しました', columns: newHeadersEn };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * C列（store）にデータ検証（プルダウン）を追加
 * [理由] departmentを追加せず、既存のstore列を拡張する
 */
function addStoreValidation() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    
    if (!sheet) throw new Error('USERSシートが見つかりません');
    
    const lastRow = sheet.getLastRow();
    const dataStartRow = 3; // 3行目からデータ
    const dataRows = lastRow - dataStartRow + 1;
    
    if (dataRows < 1) {
      Logger.log('データ行がないためスキップします');
      return { success: true, message: 'データ行なし' };
    }
    
    // C列: store（渋谷店/福岡店/本社/その他）
    const storeRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['渋谷店', '福岡店', '本社', 'その他'], true)
      .setAllowInvalid(false)
      .setHelpText('所属を選択してください')
      .build();
    sheet.getRange(dataStartRow, 3, dataRows, 1).setDataValidation(storeRule);
    
    Logger.log('✅ store列にデータ検証を追加しました');
    return { success: true };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 既存ユーザーにデフォルト値を一括設定
 * [注意] 3行目以降がデータ行
 */
function setDefaultValuesForExistingUsers() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    
    if (!sheet) throw new Error('USERSシートが見つかりません');
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0]; // 1行目: 英語ヘッダー
    
    // 列インデックスを取得（department削除）
    const roleIdx = headers.indexOf('role');
    const empTypeIdx = headers.indexOf('employmentType');
    const workDaysIdx = headers.indexOf('weeklyWorkDays');
    const firstLoginIdx = headers.indexOf('firstLoginDate');
    const favProductIdx = headers.indexOf('favoriteProduct');
    const commentIdx = headers.indexOf('comment');
    const avatarIdx = headers.indexOf('avatarUrl');
    
    if (roleIdx === -1) {
      throw new Error('新列が追加されていません。先にaddColumnsToUsersSheetを実行してください');
    }
    
    // データ行は3行目から（1行目=英語、2行目=日本語、3行目以降=データ）
    const dataStartRow = 2; // 配列インデックスは2（実際の3行目）
    
    // データ行を処理
    let updateCount = 0;
    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      
      // userId（A列）が空ならスキップ
      if (!row[0]) continue;
      
      // 空の場合のみデフォルト値を設定
      if (!row[roleIdx]) {
        sheet.getRange(rowNum, roleIdx + 1).setValue('staff');
      }
      if (!row[empTypeIdx]) {
        sheet.getRange(rowNum, empTypeIdx + 1).setValue('アルバイト');
      }
      if (!row[workDaysIdx]) {
        sheet.getRange(rowNum, workDaysIdx + 1).setValue(5);
      }
      if (!row[firstLoginIdx]) {
        // lastDailyDate（I列）を初ログイン日時とする、なければ今日
        const lastDate = row[8] || new Date();
        sheet.getRange(rowNum, firstLoginIdx + 1).setValue(lastDate);
      }
      if (!row[favProductIdx]) {
        sheet.getRange(rowNum, favProductIdx + 1).setValue('');
      }
      if (!row[commentIdx]) {
        sheet.getRange(rowNum, commentIdx + 1).setValue('');
      }
      if (!row[avatarIdx]) {
        sheet.getRange(rowNum, avatarIdx + 1).setValue('');
      }
      
      updateCount++;
    }
    
    Logger.log(`✅ ${updateCount}件のユーザーにデフォルト値を設定しました`);
    return { success: true, count: updateCount };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * データ検証（プルダウン）を設定
 * [注意] 3行目以降がデータ行
 */
function setDataValidation() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    
    if (!sheet) throw new Error('USERSシートが見つかりません');
    
    const lastRow = sheet.getLastRow();
    const dataStartRow = 3; // 3行目からデータ
    const dataRows = lastRow - dataStartRow + 1;
    
    if (dataRows < 1) {
      Logger.log('データ行がないためスキップします');
      return { success: true, message: 'データ行なし' };
    }
    
    // J列: role（staff/manager/admin/superadmin）
    const roleRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['staff', 'manager', 'admin', 'superadmin'], true)
      .setAllowInvalid(false)
      .setHelpText('管理権限を選択してください')
      .build();
    sheet.getRange(dataStartRow, 10, dataRows, 1).setDataValidation(roleRule);
    
    // K列: employmentType
    const empRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['アルバイト', '社員', '業務委託', '管理者'], true)
      .setAllowInvalid(false)
      .setHelpText('雇用形態を選択してください')
      .build();
    sheet.getRange(dataStartRow, 11, dataRows, 1).setDataValidation(empRule);
    
    // L列: weeklyWorkDays（1-6）
    const workDaysRule = SpreadsheetApp.newDataValidation()
      .requireNumberBetween(1, 6)
      .setAllowInvalid(false)
      .setHelpText('1〜6の数値を入力してください')
      .build();
    sheet.getRange(dataStartRow, 12, dataRows, 1).setDataValidation(workDaysRule);
    
    Logger.log('✅ データ検証を設定しました');
    return { success: true };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * [メイン実行] 全ての設定を順番に実行
 */
function setupUsersSheetExtension() {
  Logger.log('=== USERSシート拡張セットアップ開始 ===');
  Logger.log('[構造] 1行目=英語ヘッダー, 2行目=日本語ヘッダー, 3行目以降=データ');
  Logger.log('[変更] department列は追加せず、store列を拡張\n');
  
  Logger.log('STEP1: 新列追加（J-P列）');
  const step1 = addColumnsToUsersSheet();
  Logger.log(JSON.stringify(step1, null, 2));
  
  if (!step1.success) {
    Logger.log('❌ STEP1で失敗したため中断します');
    return;
  }
  
  Utilities.sleep(2000); // 2秒待機
  
  Logger.log('\nSTEP2: store列にデータ検証追加');
  const step1b = addStoreValidation();
  Logger.log(JSON.stringify(step1b, null, 2));
  
  Utilities.sleep(2000);
  
  Logger.log('\nSTEP3: デフォルト値設定');
  const step2 = setDefaultValuesForExistingUsers();
  Logger.log(JSON.stringify(step2, null, 2));
  
  Utilities.sleep(2000);
  
  Logger.log('\nSTEP4: 新列のデータ検証設定');
  const step3 = setDataValidation();
  Logger.log(JSON.stringify(step3, null, 2));
  
  Logger.log('\n=== ✅ セットアップ完了 ===');
  Logger.log('USERSスプレッドシートを開いて確認してください');
  Logger.log('https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_IDS.USERS + '/edit');
}

/**
 * [テスト] 新列が正しく追加されているか確認
 */
function testUsersSheetExtension() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    
    const headersEn = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headersJa = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log('=== 現在の列構成 ===');
    Logger.log('\n1行目（英語ヘッダー）:');
    headersEn.forEach((header, idx) => {
      Logger.log(`  ${String.fromCharCode(65 + idx)}列: ${header}`);
    });
    
    Logger.log('\n2行目（日本語ヘッダー）:');
    headersJa.forEach((header, idx) => {
      Logger.log(`  ${String.fromCharCode(65 + idx)}列: ${header}`);
    });
    
    // 新列の存在確認
    const requiredCols = ['role', 'employmentType', 'weeklyWorkDays', 
                          'firstLoginDate', 'favoriteProduct', 'comment', 'avatarUrl'];
    const missing = requiredCols.filter(col => !headersEn.includes(col));
    
    if (missing.length > 0) {
      Logger.log('\n❌ 不足している列: ' + missing.join(', '));
    } else {
      Logger.log('\n✅ すべての新列が存在します');
    }
    
    // department列が存在しないことを確認
    if (headersEn.includes('department')) {
      Logger.log('\n⚠️ 警告: department列が存在します（削除推奨）');
    } else {
      Logger.log('\n✅ department列は存在しません（正しい）');
    }
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
  }
}
function addColumnsToUsersSheet() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    
    if (!sheet) throw new Error('USERSシートが見つかりません');
    
    // 既存の列数を確認
    const lastCol = sheet.getLastColumn();
    Logger.log(`現在の列数: ${lastCol}`);
    
    // J列（10列目）以降に新ヘッダーを追加
    const newHeaders = [
      'role',              // J列: 管理権限
      'department',        // K列: 所属
      'employmentType',    // L列: 雇用形態
      'weeklyWorkDays',    // M列: 週間勤務日数
      'firstLoginDate',    // N列: 初ログイン日時
      'favoriteProduct',   // O列: 推しカラコン
      'comment',           // P列: ひとことコメント
      'avatarUrl'          // Q列: 顔写真URL
    ];
    
    // 日本語ヘッダー（2行目）
    const newHeadersJa = [
      '管理権限',
      '所属',
      '雇用形態',
      '週間勤務日数',
      '初ログイン日時',
      '推しカラコン',
      'ひとことコメント',
      '顔写真URL'
    ];
    
    const startCol = 10; // J列
    
    // 1行目: 英語ヘッダー
    newHeaders.forEach((header, idx) => {
      sheet.getRange(1, startCol + idx).setValue(header);
    });
    
    // 2行目: 日本語ヘッダー（説明用）を挿入
    // まず2行目があるか確認
    if (sheet.getLastRow() < 2) {
      sheet.insertRowAfter(1);
    }
    
    newHeadersJa.forEach((header, idx) => {
      sheet.getRange(2, startCol + idx).setValue(header);
    });
    
    // ヘッダーのスタイル設定
    const headerRange1 = sheet.getRange(1, startCol, 1, newHeaders.length);
    headerRange1.setFontWeight('bold');
    headerRange1.setBackground('#d9ead3');
    
    const headerRange2 = sheet.getRange(2, startCol, 1, newHeaders.length);
    headerRange2.setFontWeight('normal');
    headerRange2.setFontStyle('italic');
    headerRange2.setBackground('#f3f3f3');
    
    // 列幅の自動調整
    for (let i = 0; i < newHeaders.length; i++) {
      sheet.autoResizeColumn(startCol + i);
    }
    
    Logger.log('✅ 新列の追加が完了しました');
    return { success: true, message: '新列を追加しました' };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 既存ユーザーにデフォルト値を一括設定
 */
function setDefaultValuesForExistingUsers() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    
    if (!sheet) throw new Error('USERSシートが見つかりません');
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 列インデックスを取得
    const roleIdx = headers.indexOf('role');
    const deptIdx = headers.indexOf('department');
    const empTypeIdx = headers.indexOf('employmentType');
    const workDaysIdx = headers.indexOf('weeklyWorkDays');
    const firstLoginIdx = headers.indexOf('firstLoginDate');
    const favProductIdx = headers.indexOf('favoriteProduct');
    const commentIdx = headers.indexOf('comment');
    const avatarIdx = headers.indexOf('avatarUrl');
    
    if (roleIdx === -1) {
      throw new Error('新列が追加されていません。先にaddColumnsToUsersSheetを実行してください');
    }
    
    // データ行の開始位置を判定（1行目=英語ヘッダー、2行目=日本語ヘッダーの場合は3行目から）
    let dataStartRow = 1;
    if (data.length > 1 && typeof data[1][0] === 'string' && data[1][0].includes('ユーザー')) {
      dataStartRow = 2; // 2行目が日本語説明なら、データは3行目から
    }
    
    // データ行を処理
    let updateCount = 0;
    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      
      // userId（A列）が空ならスキップ
      if (!row[0]) continue;
      
      // 空の場合のみデフォルト値を設定
      if (!row[roleIdx]) {
        sheet.getRange(rowNum, roleIdx + 1).setValue('staff');
      }
      if (!row[deptIdx]) {
        // store列（C列）の値を使用
        const store = row[2] || 'その他';
        sheet.getRange(rowNum, deptIdx + 1).setValue(store);
      }
      if (!row[empTypeIdx]) {
        sheet.getRange(rowNum, empTypeIdx + 1).setValue('アルバイト');
      }
      if (!row[workDaysIdx]) {
        sheet.getRange(rowNum, workDaysIdx + 1).setValue(5);
      }
      if (!row[firstLoginIdx]) {
        // lastDailyDate（I列）を初ログイン日時とする、なければ今日
        const lastDate = row[8] || new Date();
        sheet.getRange(rowNum, firstLoginIdx + 1).setValue(lastDate);
      }
      if (!row[favProductIdx]) {
        sheet.getRange(rowNum, favProductIdx + 1).setValue('');
      }
      if (!row[commentIdx]) {
        sheet.getRange(rowNum, commentIdx + 1).setValue('');
      }
      if (!row[avatarIdx]) {
        sheet.getRange(rowNum, avatarIdx + 1).setValue('');
      }
      
      updateCount++;
    }
    
    Logger.log(`✅ ${updateCount}件のユーザーにデフォルト値を設定しました`);
    return { success: true, count: updateCount };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * データ検証（プルダウン）を設定
 */
function setDataValidation() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    
    if (!sheet) throw new Error('USERSシートが見つかりません');
    
    const lastRow = sheet.getLastRow();
    
    // データ行の開始位置（ヘッダーが2行なら3行目から）
    const dataStartRow = 3;
    const dataRows = lastRow - dataStartRow + 1;
    
    if (dataRows < 1) {
      Logger.log('データ行がないためスキップします');
      return { success: true, message: 'データ行なし' };
    }
    
    // J列: role（staff/manager/admin/superadmin）
    const roleRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['staff', 'manager', 'admin', 'superadmin'], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(dataStartRow, 10, dataRows, 1).setDataValidation(roleRule);
    
    // K列: department
    const deptRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['渋谷店', '福岡店', '本社', 'その他'], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(dataStartRow, 11, dataRows, 1).setDataValidation(deptRule);
    
    // L列: employmentType
    const empRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['アルバイト', '社員', '業務委託', '管理者'], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(dataStartRow, 12, dataRows, 1).setDataValidation(empRule);
    
    // M列: weeklyWorkDays（1-6）
    const workDaysRule = SpreadsheetApp.newDataValidation()
      .requireNumberBetween(1, 6)
      .setAllowInvalid(false)
      .setHelpText('1〜6の数値を入力してください')
      .build();
    sheet.getRange(dataStartRow, 13, dataRows, 1).setDataValidation(workDaysRule);
    
    Logger.log('✅ データ検証を設定しました');
    return { success: true };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * [メイン実行] 全ての設定を順番に実行
 */
function setupUsersSheetExtension() {
  Logger.log('=== USERSシート拡張セットアップ開始 ===\n');
  
  Logger.log('STEP1: 新列追加');
  const step1 = addColumnsToUsersSheet();
  Logger.log(JSON.stringify(step1, null, 2));
  
  if (!step1.success) {
    Logger.log('❌ STEP1で失敗したため中断します');
    return;
  }
  
  Utilities.sleep(2000); // 2秒待機
  
  Logger.log('\nSTEP2: デフォルト値設定');
  const step2 = setDefaultValuesForExistingUsers();
  Logger.log(JSON.stringify(step2, null, 2));
  
  Utilities.sleep(2000);
  
  Logger.log('\nSTEP3: データ検証設定');
  const step3 = setDataValidation();
  Logger.log(JSON.stringify(step3, null, 2));
  
  Logger.log('\n=== ✅ セットアップ完了 ===');
  Logger.log('USERSスプレッドシートを開いて確認してください');
}

/**
 * [テスト] 新列が正しく追加されているか確認
 */
function testUsersSheetExtension() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log('=== 現在の列構成 ===');
    headers.forEach((header, idx) => {
      Logger.log(`${String.fromCharCode(65 + idx)}列: ${header}`);
    });
    
    // 新列の存在確認
    const requiredCols = ['role', 'department', 'employmentType', 'weeklyWorkDays', 
                          'firstLoginDate', 'favoriteProduct', 'comment', 'avatarUrl'];
    const missing = requiredCols.filter(col => !headers.includes(col));
    
    if (missing.length > 0) {
      Logger.log('\n❌ 不足している列: ' + missing.join(', '));
    } else {
      Logger.log('\n✅ すべての新列が存在します');
    }
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
  }
}