// filename: TestQuiz.js

/**
 * クイズ生成テスト
 * なぜ: GASエディタから手動実行して問題生成をテスト
 */
function testQuizGeneration() {
  Logger.log('=== クイズ生成テスト開始 ===');
  
  try {
    const result = getQuizQuestions();
    
    Logger.log('成功: ' + result.success);
    Logger.log('問題数: ' + result.questions.length);
    
    if (result.questions.length > 0) {
      const q = result.questions[0];
      Logger.log('--- 1問目のサンプル ---');
      Logger.log('問題番号: ' + q.questionNumber);
      Logger.log('正解: ' + q.correctAnswer.I + ' ' + q.correctAnswer.J);
      Logger.log('レンズ画像URL: ' + q.lensImageUrl);
      Logger.log('選択肢数: ' + q.options.length);
      Logger.log('ヒント1: DIA=' + q.hint1.dia);
      Logger.log('ヒント2: ' + q.hint2.comment);
    }
    
    Logger.log('=== テスト完了 ===');
    
  } catch (error) {
    Logger.log('❌ エラー: ' + error.message);
  }
}

/**
 * クイズ生成URL一覧テスト
 * なぜ: 各問題のレンズ/サムネURLをログで確認
 */
function testQuizGenerationListUrls() {
  Logger.log('=== URL一覧テスト ===');
  try {
    const result = getQuizQuestions();
    result.questions.forEach(function(q, i){
      Logger.log('#' + (i+1) + ' 正解: ' + q.correctAnswer.I + ' ' + q.correctAnswer.J);
      Logger.log('  lens:   ' + q.lensImageUrl);
      Logger.log('  samune: ' + q.thumbnailImageUrl);
    });
  } catch (e) {
    Logger.log('❌ エラー: ' + e.message);
  }
}

/**
 * 個別アイテムの画像URLとHTTPステータスを確認（例: バンビシリーズ ヴィンテージ/ヴィンテージグレー/1day）
 * Apps Scriptの実行からこの関数を実行してください。
 */
function testCheckImage_BambiVintageGray_1day() {
  const BRAND = 'バンビシリーズ ヴィンテージ';
  const COLOR = 'ヴィンテージグレー';
  const PERIOD = '1day';
  
  const rows = readMaster_();
  let items = rows.filter(function(r){
    return String(r.I).trim() === BRAND && String(r.J).trim() === COLOR && String(r.K).trim().toLowerCase() === PERIOD;
  });
  
  if (items.length === 0) {
    // 近似一致のフォールバック（前後空白/大文字小文字/部分一致）
    items = rows.filter(function(r){
      return String(r.I).indexOf('バンビシリーズ') !== -1 &&
             String(r.I).indexOf('ヴィンテージ') !== -1 &&
             String(r.J).indexOf('ヴィンテージグレー') !== -1 &&
             String(r.K).toLowerCase().indexOf('1day') !== -1;
    });
  }
  
  if (items.length === 0) {
    Logger.log('該当アイテムがmasterに見つかりませんでした。');
    return;
  }
  
  const tgt = items[0];
  const lens = buildImageUrl_(tgt.E, tgt.I, tgt.J, tgt.K, 'lens');
  const samune = buildImageUrl_(tgt.E, tgt.I, tgt.J, tgt.K, 'samune');
  const filenameLens = sanitizeFilename_(tgt.E + '_' + tgt.I + '_' + tgt.J + '_' + tgt.K + '_lens.jpg');
  const filenameSamune = sanitizeFilename_(tgt.E + '_' + tgt.I + '_' + tgt.J + '_' + tgt.K + '_samune.jpg');
  
  Logger.log('--- 対象行 ---');
  Logger.log('E(元品番): ' + tgt.E);
  Logger.log('I(ブランド): ' + tgt.I);
  Logger.log('J(カラー): ' + tgt.J);
  Logger.log('K(装用期間): ' + tgt.K);
  Logger.log('lens filename:   ' + filenameLens);
  Logger.log('samune filename: ' + filenameSamune);
  Logger.log('lens URL:   ' + lens);
  Logger.log('samune URL: ' + samune);
  
  // 画像のHTTPステータス確認
  function status(url){
    try {
      const res = UrlFetchApp.fetch(url, {muteHttpExceptions: true, followRedirects: true});
      return res.getResponseCode();
    } catch (e) {
      Logger.log('fetch error: ' + e.message);
      return -1;
    }
  }
  const lensStatus = status(lens);
  const samuneStatus = status(samune);
  Logger.log('HTTP lens: ' + lensStatus + ', samune: ' + samuneStatus);
}
