// filename: QuizLogic.js

/**
 * カテゴリ文字列を配列に分割
 * なぜ: "ブラウン,ベージュ" → ["ブラウン", "ベージュ"]
 */
const splitColors = function(s) {
  return String(s || "")
    .split(/[\,\u3001\uFF0C\u30FB\/／\|]+/)
    .map(function(x){ return x.trim(); })
    .filter(function(x){ return x; });
};

/**
 * 複合キー生成（E|I|J）
 * なぜ: 同一デザインの重複を除外するためのキー
 */
const ck = function(r) { return [r.E, r.I, r.J].join("|"); };

/**
 * 問題生成（10問）
 * なぜ: masterシートから10問をランダム抽出し、各問に誤答3件を付与
 * 
 * @param {number} count - 問題数（デフォルト10）
 * @return {Array<Object>} 問題配列
 */
function generateQuestions_(count) {
  count = (typeof count === 'number' && count > 0) ? count : 10;
  const allItems = readMaster_();
  
  if (allItems.length < 4) {
    throw new Error('データ不足: 最低4件の商品が必要です');
  }
  
  const questions = [];
  const usedKeys = new Set();
  
  // シャッフル用にコピー
  const shuffled = allItems.slice().sort(function(){ return Math.random() - 0.5; });
  
  // 10問選定（E|I|J重複除外）
  for (var i = 0; i < shuffled.length && questions.length < count; i++) {
    var candidate = shuffled[i];
    var key = ck(candidate);
    if (!usedKeys.has(key)) {
      questions.push(candidate);
      usedKeys.add(key);
    }
  }
  
  if (questions.length < count) {
    Logger.log('警告: ' + count + '問中' + questions.length + '問のみ生成できました');
  }
  
  // 各問題に誤答3件を生成
  return questions.map(function(correct, idx){
    var wrongs = selectWrongAnswers_(correct, allItems);
    return makeQuestion_(correct, wrongs, idx + 1);
  });
}

/**
 * 誤答3件抽出（3段階フォールバック）
 * なぜ: カテゴリ一致優先→カテゴリ無視→完全ランダムで必ず3件確保
 * 
 * @param {Object} correct - 正解データ
 * @param {Array<Object>} pool - 全商品データ
 * @param {number} n - 必要な誤答数（デフォルト3）
 * @return {Array<Object>} 誤答3件
 */
function selectWrongAnswers_(correct, pool, n) {
  n = n || 3;
  var correctKey = ck(correct);
  var correctCategories = splitColors(correct.AJ);
  
  // 【第1優先】カテゴリ一致
  var cands = pool.filter(function(r){
    if (ck(r) === correctKey) return false;
    var itemCategories = splitColors(r.AJ);
    return itemCategories.some(function(cat){ return correctCategories.indexOf(cat) !== -1; });
  });
  
  cands.sort(function(){ return Math.random() - 0.5; });
  var picked = cands.slice(0, n);
  
  // 【第2優先】カテゴリ無視
  if (picked.length < n) {
    var remaining = pool.filter(function(r){
      return ck(r) !== correctKey && picked.indexOf(r) === -1;
    });
    remaining.sort(function(){ return Math.random() - 0.5; });
    for (var i = 0; i < remaining.length && picked.length < n; i++) {
      picked.push(remaining[i]);
    }
  }
  
  // 【第3優先】完全ランダム（E|I|J|K違いも許容）
  if (picked.length < n) {
    var correctFullKey = ck(correct) + '|' + correct.K;
    var pickedFullKeys = picked.map(function(p){ return ck(p) + '|' + p.K; });
    var allAvailable = pool.filter(function(r){
      var fullKey = ck(r) + '|' + r.K;
      return fullKey !== correctFullKey && pickedFullKeys.indexOf(fullKey) === -1;
    });
    allAvailable.sort(function(){ return Math.random() - 0.5; });
    for (var j = 0; j < allAvailable.length && picked.length < n; j++) {
      picked.push(allAvailable[j]);
    }
  }
  
  return picked.slice(0, n);
}

/**
 * 1問の問題オブジェクト構築
 * なぜ: 正解と誤答3件をシャッフルして問題形式に整形
 * 
 * @param {Object} correct - 正解データ
 * @param {Array<Object>} wrongs - 誤答3件
 * @param {number} qNum - 問題番号
 * @return {Object} 問題オブジェクト
 */
function makeQuestion_(correct, wrongs, qNum) {
  var options = [
    { id: 1, brandName: correct.I, colorName: correct.J, isCorrect: true }
  ].concat(wrongs.map(function(w, i){
    return { id: i + 2, brandName: w.I, colorName: w.J, isCorrect: false };
  })).sort(function(){ return Math.random() - 0.5; });
  
  return {
    questionNumber: qNum,
    lensImageUrl: buildImageUrl_(correct.E, correct.I, correct.J, correct.K, 'lens'),
    thumbnailImageUrl: buildImageUrl_(correct.E, correct.I, correct.J, correct.K, 'samune'),
    correctAnswer: { E: correct.E, I: correct.I, J: correct.J, K: correct.K },
    options: options,
    hint1: { dia: correct.P || "", gdia: correct.Q || "", bc: correct.R || "" },
    hint2: { comment: correct.AK || "" }
  };
}

/**
 * スコア計算
 * なぜ: 正答数とヒント使用数からスコアを算出
 * 
 * @param {number} correct - 正解数
 * @param {number} total - 総問題数
 * @param {number} hints - ヒント使用回数
 * @return {number} スコア（0-100）
 */
function calculateScore_(correct, total, hints) {
  var incorrect = total - correct;
  var score = 100 - (incorrect * 10) - (hints * 3);
  return Math.max(0, Math.min(100, score));
}

