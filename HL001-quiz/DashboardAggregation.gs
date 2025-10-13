// filename: DashboardAggregation.gs

/**
 * ダッシュボードデータ集計処理
 * HISTORY、USERSから実データを集計してダッシュボードシートに書き込む
 */

/**
 * 期間フィルタの開始日時を取得（RankingAPI.gsと同じロジック）
 */
function getFilterStartDate(scope) {
  const now = new Date();
  let startDate;
  
  switch (String(scope || 'monthly')) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      const daysToMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'all':
      // 累計：過去すべてのデータを対象とするため、十分に古い日付を設定
      startDate = new Date(2000, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;
  }
  
  return startDate;
}

/**
 * 期間ラベルを取得
 */
function getPeriodLabel(scope) {
  const now = new Date();
  const tz = 'Asia/Tokyo';
  
  switch (String(scope || 'monthly')) {
    case 'daily':
      return Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    case 'weekly':
      const startDate = getFilterStartDate('weekly');
      return Utilities.formatDate(startDate, tz, 'yyyy年MM月第') + Math.ceil(now.getDate() / 7) + '週';
    case 'yearly':
      return Utilities.formatDate(now, tz, 'yyyy年');
    case 'all':
      return '累計';
    case 'monthly':
    default:
      return Utilities.formatDate(now, tz, 'yyyy年MM月');
  }
}

/**
 * 1. DASHBOARD_SUMMARY（全体サマリ）を更新
 */
function updateDashboardSummary(period) {
  try {
    Logger.log(`=== DASHBOARD_SUMMARY更新開始（${period}） ===`);
    
    const startDate = getFilterStartDate(period);
    const periodLabel = getPeriodLabel(period);
    
    // HISTORYからデータ取得
    const histSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    let histSheet = histSs.getSheetByName('history') || histSs.getSheetByName('HISTORY') || histSs.getSheetByName('quiz_history') || histSs.getSheetByName('QUIZ_HISTORY');
    if (!histSheet) histSheet = histSs.getSheetByName('HISTORY');
    if (!histSheet) histSheet = histSs.getSheets()[0]; // 最初のシート
    
    if (!histSheet) throw new Error('HISTORYシートが見つかりません');
    const histData = histSheet.getDataRange().getValues();
    
    // USERSからデータ取得
    const usersSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const usersSheet = usersSs.getSheetByName('USERS') || usersSs.getSheetByName('users');
    const usersData = usersSheet.getDataRange().getValues();
    
    // 総ユーザー数（3行目以降）
    const totalUsers = usersData.length - 2;
    
    // HISTORYを集計（3行目以降がデータ）
    const activeUserSet = new Set();
    let totalPlays = 0;
    let dailyPlays = 0;
    let practicePlays = 0;
    const scores = [];
    const accuracies = [];
    const timeBonuses = [];
    
    for (let i = 2; i < histData.length; i++) {
      const row = histData[i];
      const timestamp = new Date(row[1]); // B列: timestamp
      const userId = String(row[2] || ''); // C列: userId
      const mode = String(row[3] || ''); // D列: mode
      const totalScore = Number(row[10] || 0); // K列: totalScore
      
      if (!(timestamp instanceof Date) || isNaN(timestamp)) continue;
      if (timestamp < startDate) continue;
      if (!userId) continue;
      
      activeUserSet.add(userId);
      totalPlays++;
      
      if (mode === 'daily') {
        dailyPlays++;
      } else if (mode === 'practice') {
        practicePlays++;
      }
      
      // メタデータ（L列）から正答率とタイムボーナスを取得
      try {
        const meta = JSON.parse(row[11] || '{}');
        if (totalScore > 0) scores.push(totalScore);
        if (meta.accuracy) accuracies.push(Number(meta.accuracy));
        if (meta.timeBonus) timeBonuses.push(Number(meta.timeBonus));
      } catch (e) {
        // JSON解析エラーは無視
      }
    }
    
    const activeUsers = activeUserSet.size;
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const avgAccuracy = accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : 0;
    const avgTimeBonus = timeBonuses.length > 0 ? timeBonuses.reduce((a, b) => a + b, 0) / timeBonuses.length : 0;
    
    // DASHBOARD_SUMMARYシートに書き込み
    const dashSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);
    const dashSheet = dashSs.getSheetByName('DASHBOARD_SUMMARY');
    
    // 既存データをクリア（3行目以降）
    if (dashSheet.getLastRow() >= 3) {
      dashSheet.getRange(3, 1, dashSheet.getLastRow() - 2, dashSheet.getLastColumn()).clearContent();
    }
    
    // 新データを書き込み
    const newRow = [
      period,
      periodLabel,
      totalUsers,
      activeUsers,
      totalPlays,
      dailyPlays,
      practicePlays,
      Math.round(avgScore * 10) / 10,
      Math.round(avgAccuracy * 10) / 10,
      Math.round(avgTimeBonus * 10) / 10,
      activeUsers, // uniqueLogins（簡易版）
      new Date()
    ];
    
    dashSheet.getRange(3, 1, 1, newRow.length).setValues([newRow]);
    
    Logger.log(`✅ DASHBOARD_SUMMARY更新完了: ${activeUsers}/${totalUsers}ユーザー, ${totalPlays}プレイ`);
    return { success: true, period: period, data: newRow };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 2. STORE_STATS（店舗別集計）を更新
 */
function updateStoreStats(period) {
  try {
    Logger.log(`=== STORE_STATS更新開始（${period}） ===`);
    
    const startDate = getFilterStartDate(period);
    
    // HISTORYとUSERSを取得
    const histSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    let histSheet = histSs.getSheetByName('history') || histSs.getSheetByName('HISTORY') || histSs.getSheetByName('quiz_history') || histSs.getSheetByName('QUIZ_HISTORY');
    if (!histSheet) histSheet = histSs.getSheetByName('HISTORY');
    if (!histSheet) histSheet = histSs.getSheets()[0];
    
    if (!histSheet) throw new Error('HISTORYシートが見つかりません');
    const histData = histSheet.getDataRange().getValues();
    
    const usersSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const usersSheet = usersSs.getSheetByName('USERS') || usersSs.getSheetByName('users');
    if (!usersSheet) throw new Error('USERSシートが見つかりません');
    const usersData = usersSheet.getDataRange().getValues();
    
    // ユーザー情報をマップ化（userId -> {name, store}）
    const userMap = {};
    for (let i = 2; i < usersData.length; i++) {
      const userId = String(usersData[i][0] || '');
      const name = usersData[i][1];
      const store = usersData[i][2];
      if (userId) userMap[userId] = { name, store };
    }
    
    // 店舗別に集計
    const storeStats = {};
    
    for (let i = 2; i < histData.length; i++) {
      const row = histData[i];
      const timestamp = new Date(row[1]);
      const userId = String(row[2] || '');
      const mode = String(row[3] || '');
      const totalScore = Number(row[10] || 0);
      
      if (!(timestamp instanceof Date) || isNaN(timestamp)) continue;
      if (timestamp < startDate) continue;
      if (!userId || !userMap[userId]) continue;
      
      const store = userMap[userId].store || 'その他';
      
      if (!storeStats[store]) {
        storeStats[store] = {
          activeUsers: new Set(),
          totalPlays: 0,
          dailyPlays: 0,
          practicePlays: 0,
          scores: [],
          accuracies: [],
          topScore: 0,
          topScorer: ''
        };
      }
      
      const stat = storeStats[store];
      stat.activeUsers.add(userId);
      stat.totalPlays++;
      
      if (mode === 'daily') stat.dailyPlays++;
      else if (mode === 'practice') stat.practicePlays++;
      
      if (totalScore > 0) {
        stat.scores.push(totalScore);
        if (totalScore > stat.topScore) {
          stat.topScore = totalScore;
          stat.topScorer = userMap[userId].name;
        }
      }
      
      try {
        const meta = JSON.parse(row[11] || '{}');
        if (meta.accuracy) stat.accuracies.push(Number(meta.accuracy));
      } catch (e) {}
    }
    
    // 店舗ごとの総ユーザー数を計算
    const storeTotalUsers = {};
    for (let i = 2; i < usersData.length; i++) {
      const store = usersData[i][2] || 'その他';
      storeTotalUsers[store] = (storeTotalUsers[store] || 0) + 1;
    }
    
    // 結果を配列に変換
    const results = [];
    for (const store in storeStats) {
      const stat = storeStats[store];
      const totalUsers = storeTotalUsers[store] || 0;
      const activeUsers = stat.activeUsers.size;
      const activeRate = totalUsers > 0 ? (activeUsers / totalUsers * 100) : 0;
      const avgScore = stat.scores.length > 0 ? stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length : 0;
      const avgAccuracy = stat.accuracies.length > 0 ? stat.accuracies.reduce((a, b) => a + b, 0) / stat.accuracies.length : 0;
      
      results.push({
        store,
        totalUsers,
        activeUsers,
        activeRate: Math.round(activeRate * 10) / 10,
        totalPlays: stat.totalPlays,
        dailyPlays: stat.dailyPlays,
        practicePlays: stat.practicePlays,
        avgScore: Math.round(avgScore * 10) / 10,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
        topScore: stat.topScore,
        topScorer: stat.topScorer
      });
    }
    
    // 平均スコアでソート
    results.sort((a, b) => b.avgScore - a.avgScore);
    
    // ランキング付与
    results.forEach((r, idx) => r.rank = idx + 1);
    
    // STORE_STATSシートに書き込み
    const dashSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);
    const storeSheet = dashSs.getSheetByName('STORE_STATS');
    
    // 既存データをクリア
    if (storeSheet.getLastRow() >= 3) {
      storeSheet.getRange(3, 1, storeSheet.getLastRow() - 2, storeSheet.getLastColumn()).clearContent();
    }
    
    // 新データを書き込み
    const rows = results.map(r => [
      period,
      r.store,
      r.totalUsers,
      r.activeUsers,
      r.activeRate,
      r.totalPlays,
      r.dailyPlays,
      r.practicePlays,
      r.avgScore,
      r.avgAccuracy,
      r.topScore,
      r.topScorer,
      r.rank,
      new Date()
    ]);
    
    if (rows.length > 0) {
      storeSheet.getRange(3, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    Logger.log(`✅ STORE_STATS更新完了: ${results.length}店舗`);
    return { success: true, period: period, count: results.length };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 3. USER_ANALYTICS（個人別詳細）を更新
 */
function updateUserAnalytics(period) {
  try {
    Logger.log(`=== USER_ANALYTICS更新開始（${period}） ===`);
    
    const startDate = getFilterStartDate(period);
    
    // データ取得
    const histSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    let histSheet = histSs.getSheetByName('history') || histSs.getSheetByName('HISTORY') || histSs.getSheetByName('quiz_history') || histSs.getSheetByName('QUIZ_HISTORY');
    if (!histSheet) histSheet = histSs.getSheetByName('HISTORY');
    if (!histSheet) histSheet = histSs.getSheets()[0];
    
    if (!histSheet) throw new Error('HISTORYシートが見つかりません');
    const histData = histSheet.getDataRange().getValues();
    
    const usersSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const usersSheet = usersSs.getSheetByName('USERS') || usersSs.getSheetByName('users');
    if (!usersSheet) throw new Error('USERSシートが見つかりません');
    const usersData = usersSheet.getDataRange().getValues();
    
    // ユーザー情報をマップ化
    const userMap = {};
    for (let i = 2; i < usersData.length; i++) {
      const userId = String(usersData[i][0] || '');
      if (!userId) continue;
      userMap[userId] = {
        name: usersData[i][1],
        store: usersData[i][2],
        role: usersData[i][9], // J列
        employmentType: usersData[i][10], // K列
        streak: usersData[i][5]
      };
    }
    
    // ユーザーごとに集計
    const userStats = {};
    
    for (let i = 2; i < histData.length; i++) {
      const row = histData[i];
      const timestamp = new Date(row[1]);
      const userId = String(row[2] || '');
      const mode = String(row[3] || '');
      const totalScore = Number(row[10] || 0);
      
      if (!(timestamp instanceof Date) || isNaN(timestamp)) continue;
      if (timestamp < startDate) continue;
      if (!userId || !userMap[userId]) continue;
      
      if (!userStats[userId]) {
        userStats[userId] = {
          totalPlays: 0,
          dailyPlays: 0,
          practicePlays: 0,
          scores: [],
          accuracies: [],
          timeBonuses: [],
          lastPlayDate: timestamp
        };
      }
      
      const stat = userStats[userId];
      stat.totalPlays++;
      
      if (mode === 'daily') stat.dailyPlays++;
      else if (mode === 'practice') stat.practicePlays++;
      
      if (totalScore > 0) stat.scores.push(totalScore);
      
      if (timestamp > stat.lastPlayDate) {
        stat.lastPlayDate = timestamp;
      }
      
      try {
        const meta = JSON.parse(row[11] || '{}');
        if (meta.accuracy) stat.accuracies.push(Number(meta.accuracy));
        if (meta.timeBonus) stat.timeBonuses.push(Number(meta.timeBonus));
      } catch (e) {}
    }
    
    // 結果を配列に変換
    const results = [];
    for (const userId in userStats) {
      const stat = userStats[userId];
      const user = userMap[userId];
      const bestScore = stat.scores.length > 0 ? Math.max(...stat.scores) : 0;
      const avgScore = stat.scores.length > 0 ? stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length : 0;
      const avgAccuracy = stat.accuracies.length > 0 ? stat.accuracies.reduce((a, b) => a + b, 0) / stat.accuracies.length : 0;
      const avgTimeBonus = stat.timeBonuses.length > 0 ? stat.timeBonuses.reduce((a, b) => a + b, 0) / stat.timeBonuses.length : 0;
      
      results.push({
        userId,
        name: user.name,
        store: user.store,
        role: user.role || 'staff',
        employmentType: user.employmentType || 'アルバイト',
        totalPlays: stat.totalPlays,
        dailyPlays: stat.dailyPlays,
        practicePlays: stat.practicePlays,
        bestScore,
        avgScore: Math.round(avgScore * 10) / 10,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
        avgTimeBonus: Math.round(avgTimeBonus * 10) / 10,
        streak: user.streak || 0,
        lastPlayDate: stat.lastPlayDate
      });
    }
    
    // 平均スコアでソート
    results.sort((a, b) => b.avgScore - a.avgScore);
    
    // 全体順位を付与
    results.forEach((r, idx) => r.rank = idx + 1);
    
    // 所属内順位を計算
    const storeRanks = {};
    results.forEach(r => {
      if (!storeRanks[r.store]) storeRanks[r.store] = 0;
      storeRanks[r.store]++;
      r.storeRank = storeRanks[r.store];
    });
    
    // USER_ANALYTICSシートに書き込み
    const dashSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);
    const userSheet = dashSs.getSheetByName('USER_ANALYTICS');
    
    // 既存データをクリア
    if (userSheet.getLastRow() >= 3) {
      userSheet.getRange(3, 1, userSheet.getLastRow() - 2, userSheet.getLastColumn()).clearContent();
    }
    
    // 新データを書き込み
    const rows = results.map(r => [
      period,
      r.rank,
      r.userId,
      r.name,
      r.store,
      r.role,
      r.employmentType,
      r.totalPlays,
      r.dailyPlays,
      r.practicePlays,
      r.bestScore,
      r.avgScore,
      r.avgAccuracy,
      r.avgTimeBonus,
      r.streak,
      r.lastPlayDate,
      r.storeRank,
      new Date()
    ]);
    
    if (rows.length > 0) {
      userSheet.getRange(3, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    Logger.log(`✅ USER_ANALYTICS更新完了: ${results.length}ユーザー`);
    return { success: true, period: period, count: results.length };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 4. QUESTION_ANALYSIS（問題別正答率）を更新
 */
function updateQuestionAnalysis(period) {
  try {
    Logger.log(`=== QUESTION_ANALYSIS更新開始（${period}） ===`);
    
    const startDate = getFilterStartDate(period);
    
    // HISTORYからデータ取得
    const histSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    let histSheet = histSs.getSheetByName('history') || histSs.getSheetByName('HISTORY') || histSs.getSheetByName('quiz_history') || histSs.getSheetByName('QUIZ_HISTORY');
    if (!histSheet) histSheet = histSs.getSheetByName('HISTORY');
    if (!histSheet) histSheet = histSs.getSheets()[0];
    
    if (!histSheet) throw new Error('HISTORYシートが見つかりません');
    const histData = histSheet.getDataRange().getValues();
    
    // 問題ごとに集計
    const questionStats = {};
    
    for (let i = 2; i < histData.length; i++) {
      const row = histData[i];
      const timestamp = new Date(row[1]);
      const questionId = String(row[4] || ''); // E列: questionId
      const isCorrect = row[6]; // G列: isCorrect
      const hintsUsed = Number(row[7] || 0); // H列: hintsUsed
      const timeSpent = Number(row[8] || 0); // I列: timeSpent
      
      if (!(timestamp instanceof Date) || isNaN(timestamp)) continue;
      if (timestamp < startDate) continue;
      if (!questionId) continue;
      
      if (!questionStats[questionId]) {
        questionStats[questionId] = {
          totalAttempts: 0,
          correctCount: 0,
          incorrectCount: 0,
          hintsUsed: [],
          timeSpent: []
        };
      }
      
      const stat = questionStats[questionId];
      stat.totalAttempts++;
      
      if (isCorrect) {
        stat.correctCount++;
      } else {
        stat.incorrectCount++;
      }
      
      if (hintsUsed > 0) stat.hintsUsed.push(hintsUsed);
      if (timeSpent > 0) stat.timeSpent.push(timeSpent);
    }
    
    // 結果を配列に変換
    const results = [];
    for (const questionId in questionStats) {
      const stat = questionStats[questionId];
      const accuracyRate = stat.totalAttempts > 0 ? (stat.correctCount / stat.totalAttempts * 100) : 0;
      const avgHintsUsed = stat.hintsUsed.length > 0 ? stat.hintsUsed.reduce((a, b) => a + b, 0) / stat.hintsUsed.length : 0;
      const avgTimeSpent = stat.timeSpent.length > 0 ? stat.timeSpent.reduce((a, b) => a + b, 0) / stat.timeSpent.length : 0;
      
      results.push({
        questionId,
        productName: questionId, // 仮（MASTERから取得する場合は別途実装）
        totalAttempts: stat.totalAttempts,
        correctCount: stat.correctCount,
        incorrectCount: stat.incorrectCount,
        accuracyRate: Math.round(accuracyRate * 10) / 10,
        avgHintsUsed: Math.round(avgHintsUsed * 10) / 10,
        avgTimeSpent: Math.round(avgTimeSpent * 10) / 10
      });
    }
    
    // 正答率でソート（低い順 = 難しい問題順）
    results.sort((a, b) => a.accuracyRate - b.accuracyRate);
    
    // ランキング付与
    results.forEach((r, idx) => r.rank = idx + 1);
    
    // QUESTION_ANALYSISシートに書き込み
    const dashSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);
    const qSheet = dashSs.getSheetByName('QUESTION_ANALYSIS');
    
    // 既存データをクリア
    if (qSheet.getLastRow() >= 3) {
      qSheet.getRange(3, 1, qSheet.getLastRow() - 2, qSheet.getLastColumn()).clearContent();
    }
    
    // 新データを書き込み
    const rows = results.map(r => [
      period,
      r.questionId,
      r.productName,
      r.totalAttempts,
      r.correctCount,
      r.incorrectCount,
      r.accuracyRate,
      r.avgHintsUsed,
      r.avgTimeSpent,
      r.rank,
      new Date()
    ]);
    
    if (rows.length > 0) {
      qSheet.getRange(3, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    Logger.log(`✅ QUESTION_ANALYSIS更新完了: ${results.length}問題`);
    return { success: true, period: period, count: results.length };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 5. LOGIN_HISTORY（ログイン履歴）を記録
 */
function recordLoginHistory(userId) {
  try {
    Logger.log(`=== LOGIN_HISTORY記録開始（${userId}） ===`);
    
    // ユーザー情報取得
    const usersSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.USERS);
    const usersSheet = usersSs.getSheetByName('USERS') || usersSs.getSheetByName('users');
    const usersData = usersSheet.getDataRange().getValues();
    
    let userName = userId;
    for (let i = 2; i < usersData.length; i++) {
      if (String(usersData[i][0]) === userId) {
        userName = usersData[i][1];
        break;
      }
    }
    
    const now = new Date();
    const today = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');
    
    // LOGIN_HISTORYシートを取得
    const dashSs = SpreadsheetApp.openById(CONFIG.SHEET_IDS.DASHBOARD);
    const loginSheet = dashSs.getSheetByName('LOGIN_HISTORY');
    const loginData = loginSheet.getDataRange().getValues();
    
    // 今日の記録を検索
    let existingRow = -1;
    for (let i = 2; i < loginData.length; i++) {
      const rowUserId = String(loginData[i][0]);
      const rowDate = Utilities.formatDate(new Date(loginData[i][2]), 'Asia/Tokyo', 'yyyy-MM-dd');
      
      if (rowUserId === userId && rowDate === today) {
        existingRow = i + 1; // 実際の行番号
        break;
      }
    }
    
    if (existingRow > 0) {
      // 既存の記録を更新
      const loginCount = Number(loginData[existingRow - 1][3]) + 1;
      loginSheet.getRange(existingRow, 4).setValue(loginCount); // D列: loginCount
      loginSheet.getRange(existingRow, 6).setValue(now); // F列: lastLoginTime
      loginSheet.getRange(existingRow, 9).setValue(now); // I列: updatedAt
      
      Logger.log(`✅ 既存記録更新: ${userId} - ログイン${loginCount}回目`);
    } else {
      // 新規記録を追加
      const newRow = [
        userId,
        userName,
        now,
        1, // loginCount
        now, // firstLoginTime
        now, // lastLoginTime
        0, // dailyPlays
        0, // practicePlays
        now // updatedAt
      ];
      
      loginSheet.appendRow(newRow);
      Logger.log(`✅ 新規記録追加: ${userId}`);
    }
    
    return { success: true, userId: userId };
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * [テスト] 全ての集計処理を実行
 */
function testAllAggregations() {
  Logger.log('=== 全集計処理テスト開始 ===\n');

  const period = 'monthly'; // テスト期間

  Logger.log('1. DASHBOARD_SUMMARY更新');
  const r1 = updateDashboardSummary(period);
  Logger.log(JSON.stringify(r1, null, 2) + '\n');

  Logger.log('2. STORE_STATS更新');
  const r2 = updateStoreStats(period);
  Logger.log(JSON.stringify(r2, null, 2) + '\n');

  Logger.log('3. USER_ANALYTICS更新');
  const r3 = updateUserAnalytics(period);
  Logger.log(JSON.stringify(r3, null, 2) + '\n');

  Logger.log('4. QUESTION_ANALYSIS更新');
  const r4 = updateQuestionAnalysis(period);
  Logger.log(JSON.stringify(r4, null, 2) + '\n');

  Logger.log('5. LOGIN_HISTORY記録（テストユーザー: 001）');
  const r5 = recordLoginHistory('001');
  Logger.log(JSON.stringify(r5, null, 2) + '\n');

  Logger.log('=== ✅ 全集計処理テスト完了 ===');
  Logger.log('ダッシュボードスプレッドシートを開いて確認してください:');
  Logger.log('https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_IDS.DASHBOARD + '/edit');
}

/**
 * [テスト] 累計期間の集計処理を実行
 */
function testAllPeriod() {
  Logger.log('=== 累計テスト ===');
  const result = updateDashboardSummary('all');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ 累計期間の集計が成功しました');
    Logger.log('期間ラベル: ' + getPeriodLabel('all'));
  } else {
    Logger.log('❌ 累計期間の集計が失敗しました');
  }

  return result;
}

/**
 * [便利関数] 全期間の集計を一括実行
 */
function updateAllPeriods() {
  Logger.log('=== 全期間集計開始 ===\n');
  
  const periods = ['weekly', 'monthly', 'yearly', 'all'];
  
  periods.forEach(period => {
    Logger.log(`--- ${period}の集計 ---`);
    updateDashboardSummary(period);
    updateStoreStats(period);
    updateUserAnalytics(period);
    updateQuestionAnalysis(period);
    Logger.log('');
  });
  
  Logger.log('=== ✅ 全期間集計完了 ===');
}

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
