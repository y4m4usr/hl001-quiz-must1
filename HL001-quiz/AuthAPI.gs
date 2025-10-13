// filename: AuthAPI.gs

/**
 * ログイン認証
 * @param {string} userId - スタッフ番号
 * @param {string} userName - ユーザー名
 * @return {Object}
 */
function authenticateUser(userId, userName) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('users');
    const data = sheet.getDataRange().getValues();
    
    // ヘッダー行をスキップ（2行目から）
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowUserId = String(row[0]).trim();
      const rowUserName = String(row[1]).trim();
      
      if (rowUserId === String(userId).trim() && 
          rowUserName === String(userName).trim()) {
        return {
          success: true,
          userId: row[0],
          name: row[1],
          store: row[2] || '未設定'
        };
      }
    }
    
    return {
      success: false,
      message: '入力情報が存在しません'
    };
    
  } catch (error) {
    Logger.log('authenticateUser エラー: ' + error.message);
    return {
      success: false,
      message: 'エラーが発生しました'
    };
  }
}
