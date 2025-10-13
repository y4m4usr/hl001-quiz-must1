// filename: QuizAPI.js

/**
 * クイズ問題取得API
 * なぜ: フロントエンドから呼び出して10問の問題を取得
 * 
 * @return {Object} {success: boolean, questions: Array, message: string}
 */
function getQuizQuestions() {
  try {
    const questions = generateQuestions_(10);
    
    return {
      success: true,
      questions: questions,
      message: questions.length + '問の問題を生成しました'
    };
    
  } catch (error) {
    Logger.log('getQuizQuestions エラー: ' + error.message);
    return {
      success: false,
      questions: [],
      message: 'クイズ生成に失敗しました: ' + error.message
    };
  }
}

// 回答送信は HistoryAPI.submitQuizAnswers を利用します（ここには実装しません）
