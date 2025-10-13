// filename: StatsAPI.gs

/**
 * マイ成績取得
 */
function getMyStats(userId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.HISTORY);
    const sheet = ss.getSheetByName('history')
               || ss.getSheetByName('HISTORY')
               || ss.getSheetByName('quiz_history')
               || ss.getSheetByName('QUIZ_HISTORY')
               || ss.getSheets()[0];
    
    if (!sheet) {
      throw new Error('HISTORY内の履歴シートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    
    // ヘッダー行をスキップ
    if (data.length <= 1) {
      return {
        success: true,
        recent10: []
      };
    }
    
    // ユーザーのデータのみフィルタ（C列: user_id）
    const userRows = data.slice(1).filter(row => String(row[2]).trim() === String(userId).trim());
    
    if (userRows.length === 0) {
      return {
        success: true,
        recent10: []
      };
    }
    
    // history_id（A列）でグループ化（1プレイ=複数行想定）
    const historyMap = {};
    
    userRows.forEach(row => {
      const historyId = row[0];   // A列
      const timestamp = row[1];   // B列
      const mode = String(row[3] || 'practice'); // D列: mode
      const isCorrect = row[6];   // G列: isCorrect
      const totalScore = row[10]; // K列
      const meta = (function(){ try { return JSON.parse(row[11] || '{}'); } catch(_) { return {}; } })();
      
      if (!historyMap[historyId]) {
        historyMap[historyId] = {
          historyId: historyId,
          timestamp: timestamp,
          mode: mode,
          score: totalScore,
          accuracy: Number(meta.accuracy || 0),
          hintBonus: Number(meta.hintBonus || 0),
          timeBonus: Number(meta.timeBonus || 0),
          expEarned: (meta.expEarned != null ? Number(meta.expEarned) : undefined),
          rpEarned: (meta.rpEarned != null ? Number(meta.rpEarned) : undefined),
          correctCount: 0,
          totalQuestions: 0
        };
      }
      
      historyMap[historyId].totalQuestions += 1;
      if (isCorrect) {
        historyMap[historyId].correctCount += 1;
      }
    });
    
    // 配列に変換して日付順にソート→直近10件
    const histories = Object.values(historyMap)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
    
    // 整形
    const recent10 = histories.map(h => {
      const mode = String(h.mode || 'practice');
      const modeLabel = (mode === 'daily') ? '本番' : '練習';
      const when = Utilities.formatDate(new Date(h.timestamp), 'Asia/Tokyo', 'MM/dd HH:mm');
      return {
        date: when + ' ' + '[' + modeLabel + ']',
        mode: mode,
        score: h.score,
        accuracy: h.accuracy || (h.totalQuestions > 0 ? Math.round((h.correctCount / h.totalQuestions) * 100) : 0),
        hintBonus: h.hintBonus || 0,
        timeBonus: h.timeBonus || 0,
        correctCount: h.correctCount,
        totalQuestions: h.totalQuestions,
        // 実獲得が保存されていればそれを、なければ基礎値を返す
        baseExp: (mode === 'daily') ? Number(h.score || 0) : Math.min(10, Math.round((Number(h.accuracy || 0)) / 10)),
        baseRp: (mode === 'daily') ? Number(h.score || 0) : 0,
        expEarned: (h.expEarned != null ? h.expEarned : undefined),
        rpEarned: (h.rpEarned != null ? h.rpEarned : undefined)
      };
    });
    
    return {
      success: true,
      recent10: recent10
    };
    
  } catch (error) {
    Logger.log('getMyStats エラー: ' + error.message);
    return {
      success: false,
      message: 'データ取得に失敗しました: ' + error.message
    };
  }
}
