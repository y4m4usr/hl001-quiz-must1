// filename: HomeAPI.gs

/**
 * ホーム画面データ取得
 * @param {string} userId
 * @return {Object}
 */
function getHomeData(userId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[0]).trim() === String(userId).trim()) {
        var title = '';
        try { title = getTitleForLevel(row[3] || 1); } catch(_){ title=''; }
        return {
          success: true,
          user: {
            userId: row[0],
            name: row[1] || 'ゲスト',
            store: row[2] || '未設定',
            level: row[3] || 1,
            points: row[4] || 0,
            streak: row[5] || 0,
            title: title || ''
          }
        };
      }
    }
    
    return {
      success: false,
      message: 'ユーザー情報が見つかりません'
    };
    
  } catch (error) {
    Logger.log('getHomeData エラー: ' + error.message);
    return {
      success: false,
      message: 'データ取得に失敗しました'
    };
  }
}
