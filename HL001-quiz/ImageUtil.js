// filename: ImageUtil.js

/**
 * 空白は保持し、安全でない記号のみを置換するソフト版サニタイズ
 * URLではこの結果に対して encodeURIComponent を適用して使用する
 */
function softSanitizeFilename_(str) {
  try {
    return String(str || '')
      .normalize('NFKC')
      .replace(/\u3000/g, ' ')       // 全角空白→半角空白
      .replace(/[\r\n\t]+/g, ' ')   // 制御文字は空白に
      .replace(/\s{2,}/g, ' ')       // 連続空白は1つに
      .replace(/[\/:*?"<>|\\]/g, '_') // 予約文字は置換
      .trim();
  } catch (e) {
    return String(str || '')
      .replace(/\u3000/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/[\/:*?"<>|\\]/g, '_')
      .trim();
  }
}

/**
 * 指定URLが存在するか確認（200系ならtrue）
 */
function urlExists_(url) {
  try {
    const res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true,
      headers: { 'Cache-Control': 'no-cache' },
    });
    const code = res.getResponseCode();
    return code >= 200 && code < 300;
  } catch (e) {
    return false;
  }
}

/**
 * 画像URLを拡張子・期間表記ゆれを吸収して解決
 * - Kの小文字/大文字を試行（例: 1day/1DAY）
 * - 拡張子 .jpg/.JPG/.jpeg/.JPEG を試行
 * - 最初に200を返したURLを採用
 */
function resolveImageUrl_(E, I, J, K, type) {
  const path = (type === 'lens') ? CONFIG.GITHUB.LENS_PATH : CONFIG.GITHUB.SAMUNE_PATH;
  const baseUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB.USER}/${CONFIG.GITHUB.REPO}/${CONFIG.GITHUB.BRANCH}/`;

  const k0 = String(K || '');
  const kCandidates = Array.from(new Set([k0, k0.toLowerCase(), k0.toUpperCase()]));
  const exts = ['.jpg', '.JPG', '.jpeg', '.JPEG'];

  for (let k of kCandidates) {
    const rawBase = `${E}_${I}_${J}_${k}_${type}`;
    const safeBase = softSanitizeFilename_(rawBase);
    for (let ext of exts) {
      const fname = encodeURIComponent(safeBase + ext);
      const url = baseUrl + path + fname;
      if (urlExists_(url)) {
        return url;
      }
    }
  }

  // いずれも見つからない場合は最初の候補(.jpg, 元のK)を返す
  const rawFallback = `${E}_${I}_${J}_${kCandidates[0]}_${type}`;
  const safeFallback = softSanitizeFilename_(rawFallback) + '.jpg';
  return baseUrl + path + encodeURIComponent(safeFallback);
}
