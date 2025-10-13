// filename: DataAccess.js

/**
 * 空白判定ヘルパー
 * なぜ: 空セル・"-"・空白文字をまとめて判定
 */
const isBlank = v => v === null || v === undefined || String(v).trim() === "" || v === "-";

/**
 * カラー名にCYLが含まれるか判定（全角→半角・大文字化してチェック）
 */
function isCylColorName_(name) {
  try {
    const norm = String(name || "").normalize('NFKC').toUpperCase();
    return norm.indexOf('CYL') !== -1;
  } catch (e) {
    const s = String(name || "").toUpperCase();
    return s.indexOf('CYL') !== -1;
  }
}

/**
 * masterシート読み込み
 * なぜ: 109販促データCPから商品情報を取得（3行目以降）
 *
 * @return {Array<Object>} 商品データ配列
 */
function readMaster_() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_IDS.MASTER);
    const sheet = ss.getSheetByName('master');

    if (!sheet) {
      throw new Error('masterシートが見つかりません');
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 3) {
      throw new Error('masterシートにデータがありません');
    }

    const values = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
    const COL = CONFIG.COLS.MASTER;

    const rows = [];
    for (const v of values) {
      const r = {
        E: v[COL.E - 1],   // 元品番
        I: v[COL.I - 1],   // ブランド（カナ）
        J: v[COL.J - 1],   // カラー（カナ）
        K: v[COL.K - 1],   // 装用期間
        P: v[COL.P - 1],   // DIA
        Q: v[COL.Q - 1],   // G.DIA
        R: v[COL.R - 1],   // BC
        AK: v[COL.AK - 1], // コメント
        AJ: v[COL.AJ - 1]  // カラーカテゴリ
      };

      if ([r.E, r.I, r.J, r.K, r.AJ].some(isBlank)) {
        continue; // 必須項目が欠けている行はスキップ
      }

      // 乱視用（カラー名にCYLを含む）を除外
      if (isCylColorName_(r.J)) {
        continue;
      }

      rows.push(r);
    }

    Logger.log(`readMaster_: ${rows.length}件の有効データを取得`);
    return rows;

  } catch (error) {
    Logger.log('readMaster_ エラー: ' + error.message);
    throw error;
  }
}

/**
 * 画像URL生成（フォールバック解決付）
 * - Kの大小文字差（1day/1DAY）や拡張子（.jpg/.JPG/.jpeg/.JPEG）を吸収
 */
function buildImageUrl_(E, I, J, K, type) {
  return resolveImageUrl_(E, I, J, K, type);
}

/**
 * 旧サニタイズ（互換保持用）
 */
function sanitizeFilename_(str) {
  return String(str || '')
    .replace(/\s+/g, '_')
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF.-]/g, '_')
    .replace(/_+/g, '_');
}

