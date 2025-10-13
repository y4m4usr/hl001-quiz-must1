// filename: 0_config.gs

/**
 * グローバル設定
 */
const CONFIG = {
  // スプレッドシートID
  SHEET_IDS: {
    USERS: '1X0TyeI_1zER6xIceUDSbJX-GFbqvi2orAiSWHRXlC7M',  
    '20251005_HL001_master': '1Uf2e0eXwcsQGjFtTtEeAWuYh74lh4fFE4NdjmyKHrj0',
    MASTER: '1Uf2e0eXwcsQGjFtTtEeAWuYh74lh4fFE4NdjmyKHrj0',
    HISTORY: '1ShWXLvY9RimRYfsAkwoRyM2Bfwj4a3zVmr5bQc33-o0',
    RANKINGS: '1I2REcy2v5OpyzoY3k61kCzJ3SYKOBBCMxTLCeHWutT8',
        // [追加] ダッシュボード用スプレッドシート
    DASHBOARD: '1cfL0smJHoOAMp_H4IRsoUksoA0gBjksOKDfzJQjsjkc'
  },
  
  // UI/UX画像（このリポジトリから取得）
  GITHUB_UI: {
    USER: 'y4m4usr',
    REPO: 'hl001-quiz-must1', // 拡張子 .git は不要
    BRANCH: 'main',
    UI_PATH: 'HL001-quiz/images/UI/' // 末尾スラッシュ必須
  },
    
  // 参照用: 基本情報シート（外部にID一覧がある場合に上書きする）
  INFO: {
    // ユーザーから指定: 「基本情報」タブ8〜22行に各シートのURL/IDを記載
    INFO_SHEET_ID: '1QtwI1VF-RtHmVQdPA1IttDtRAJaOj4FJHN6meCIbEEk',
    SHEET_NAME: '基本情報',
    RANGE_A1: 'A8:B22' // ラベル, 値
  },
  
  // 列定義（masterシート）
  // masterシートの列構成変更不可のため、列番号を定数化
  COLS: {
    MASTER: {
      E: 5,   // 元品番
      I: 9,   // ブランド（カナ）
      J: 10,  // カラー（カナ）
      K: 11,  // 装用期間
      P: 16,  // DIA
      Q: 17,  // G.DIA
      R: 18,  // BC
      AK: 37, // コメント
      AJ: 36  // カラーカテゴリ
    }
  },
  
  // GitHub画像設定（クイズ用レンズ/サムネは別リポジトリ）
  GITHUB: {
    USER: 'y4m4usr',
    REPO: 'HL001-quiz-karacon-academia-new',
    BRANCH: 'main',
    LENS_PATH: 'imagesnew1/lens/lens1/',
    SAMUNE_PATH: 'imagesnew1/samune/samune1/'
  }
};

/**
 * 基本情報シートからIDを読み取り、CONFIG.SHEET_IDS を上書き
 * - ラベルの例（大文字小文字/全角半角/スペース無視）
 *   USERS, ユーザー, USER
 *   MASTER, マスター, 商品マスタ
 *   HISTORY, 履歴, QUIZ_HISTORY
 *   RANKINGS, ランキング, RANK
 */
(function tryOverrideSheetIdsFromInfo_(){
  try {
    var info = CONFIG.INFO || {};
    if (!info.INFO_SHEET_ID) return; // 設定なし

    var ss = SpreadsheetApp.openById(info.INFO_SHEET_ID);
    var sh = ss.getSheetByName(info.SHEET_NAME || '基本情報');
    if (!sh) return;
    var range = sh.getRange(info.RANGE_A1 || 'A8:B22');
    var values = range.getValues();

    var normalize = function(s){
      try {
        return String(s || '')
          .trim()
          .toUpperCase()
          .replace(/[\s_\-　]+/g,'')
          .replace(/（.*?）/g,'');
      } catch(e){ return ''; }
    };
    var extractId = function(v){
      var s = String(v || '').trim();
      var m = s.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return m ? m[1] : s; // URL or plain ID
    };

    var ids = {};
    values.forEach(function(row){
      var k = normalize(row[0]);
      var id = extractId(row[1]);
      if (!k || !id) return;
      if (k.indexOf('USER') !== -1 || k.indexOf('ﾕｰｻﾞ') !== -1 || k.indexOf('ﾕｰｻﾞｰ') !== -1 || k.indexOf('ユーザ') !== -1) {
        ids.USERS = id;
      } else if (k.indexOf('MASTER') !== -1 || k.indexOf('ﾏｽﾀ') !== -1 || k.indexOf('商品ﾏｽﾀ') !== -1 || k.indexOf('商品マスタ') !== -1) {
        ids.MASTER = id;
      } else if (k.indexOf('HISTORY') !== -1 || k.indexOf('履歴') !== -1 || k.indexOf('QUIZHISTORY') !== -1) {
        ids.HISTORY = id;
      } else if (k.indexOf('RANK') !== -1 || k.indexOf('ﾗﾝｷﾝｸﾞ') !== -1 || k.indexOf('ランキング') !== -1) {
        ids.RANKINGS = id;
      }
    });

    var S = CONFIG.SHEET_IDS;
    if (ids.USERS) {
      S.USERS = ids.USERS; S.HL001_USERS = ids.USERS;
    }
    if (ids.MASTER) {
      S.MASTER = ids.MASTER; S['20251005_HL001_master'] = ids.MASTER;
    }
    if (ids.HISTORY) {
      S.HISTORY = ids.HISTORY; S.HL001_QUIZ_HISTORY = ids.HISTORY;
    }
    if (ids.RANKINGS) {
      S.RANKINGS = ids.RANKINGS; S.HL001_RANKINGS = ids.RANKINGS;
    }

  } catch (e) {
    // 読み取りに失敗しても静かにスキップ（既定値を使用）
    try { Logger.log('CONFIG override skipped: ' + e.message); } catch(_) {}
  }
})();

/**
 * UI画像のRaw配信ベースURLを返す（frontから呼び出し可）
 */
function getUiBase() {
  try {
    var g = CONFIG.GITHUB_UI;
    var base = 'https://raw.githubusercontent.com/'
      + g.USER + '/' + g.REPO + '/' + g.BRANCH + '/' + g.UI_PATH;
    return { success: true, base: base };
  } catch (e) {
    try { Logger.log('getUiBase error: ' + (e && e.message || e)); } catch(_){}
    return { success: false, base: '' };
  }
}
