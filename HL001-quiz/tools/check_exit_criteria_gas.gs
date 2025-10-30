/**
 * HL001 Exit Criteria Validator (GAS) — v2
 * A) MANIFEST 自動補完候補の生成（E/I/J/K → 期待ファイル名 → CDN存在チェック）
 * B) 画像URLの200チェック（X列・推定URLの両方）
 *
 * Script Properties (必須/推奨)
 *  - SHEET_ID       : 対象スプレッドシートID
 *  - MASTER_TAB     : "master"（既定）
 *  - MANIFEST_URL   : https://cdn.jsdelivr.net/gh/<owner>/<repo>@<ref>/manifest/manifest.json
 *  - LENS_DIR       : CDN上のレンズ画像ディレクトリ（既定: imagesnew1/lens/lens1）
 *  - SAMUNE_DIR     : CDN上のサムネ画像ディレクトリ（既定: imagesnew1/samune/samune1）
 *  - URL_TIMEOUT_MS : UrlFetchのタイムアウト（ミリ秒, 既定: 5000）
 *
 * 実行: runExitCriteriaCheck()
 * 出力:
 *  - Logger: EXIT-CRITERIA 行と集計結果
 *  - ValidationLog シート: 判定履歴
 *  - SuggestedManifest シート: 自動補完候補 (200/NG 判定付き)
 *  - UrlCheckLog シート: 各URLのHTTPコード
 */
function runExitCriteriaCheck() {
  const props = PropertiesService.getScriptProperties();
  const SHEET_ID = props.getProperty('SHEET_ID');
  const MASTER_TAB = props.getProperty('MASTER_TAB') || 'master';
  const MANIFEST_URL = props.getProperty('MANIFEST_URL');
  const LENS_DIR = props.getProperty('LENS_DIR') || 'imagesnew1/lens/lens1';
  const SAMUNE_DIR = props.getProperty('SAMUNE_DIR') || 'imagesnew1/samune/samune1';
  const URL_TIMEOUT_MS = Number(props.getProperty('URL_TIMEOUT_MS') || 5000);

  if (!SHEET_ID || !MANIFEST_URL) {
    throw new Error('Script Properties に SHEET_ID と MANIFEST_URL を設定してください。');
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(MASTER_TAB);
  if (!sh) throw new Error(`シートが見つかりません: ${MASTER_TAB}`);

  const values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error('データ行がありません。');

  // ヘッダーと列位置
  const header = values[0].map(String);
  const colIndex = (name) => {
    const idx = header.indexOf(name);
    if (idx === -1) throw new Error(`必須列が見つかりません: ${name}`);
    return idx;
  };
  const colE = colIndex('E列');
  const colI = colIndex('I列');
  const colJ = colIndex('J列');
  const colK = colIndex('K列');
  const colX = colIndex('X列');

  const manifest = fetchJson_(MANIFEST_URL);
  const cdnBase = deriveCdnBase_(MANIFEST_URL);

  // ログシート準備
  const logSheet = ensureSheet_(ss, 'ValidationLog', [
    'Timestamp(JST)', 'schema', 'E/I/J/K一致', '画像リンク', 'manifest連携', '欠損', '除外',
    '欠損数', '重複数', 'manifest未一致', 'MANIFEST_URL'
  ]);
  const sugSheet = ensureSheet_(ss, 'SuggestedManifest', [
    'CK', 'lens_url', 'lens_http', 'samune_url', 'samune_http'
  ]);
  const urlSheet = ensureSheet_(ss, 'UrlCheckLog', [
    'CK', 'type', 'url', 'http', 'note'
  ]);

  let schema = '✅';
  let ckStatus = '✅';
  let imgStatus = '✅';
  let manifestStatus = '✅';
  let missingStatus = '✅';
  let excludeStatus = '⚠️';

  let missingCount = 0;
  let dupCount = 0;
  let manifestMiss = 0;

  const seenCk = {};
  const data = values.slice(1);

  data.forEach((row) => {
    const e = String(row[colE] || '').trim();
    const i = String(row[colI] || '').trim();
    const j = String(row[colJ] || '').trim();
    const k = String(row[colK] || '').trim();
    const x = String(row[colX] || '').trim();
    const ck = `${e}_${i}_${j}_${k}`;

    if (!e || !i || !j || !k) {
      missingStatus = '⚠️';
      missingCount++;
    }

    if (seenCk[ck]) {
      ckStatus = '⚠️';
      dupCount++;
    }
    seenCk[ck] = true;

    const manifestEntry = manifest[ck];
    if (!manifestEntry) {
      manifestStatus = '⚠️';
      manifestMiss++;

      const lensUrl = `${cdnBase}/${LENS_DIR}/${ck}_lens.jpg`;
      const samuneUrl = `${cdnBase}/${SAMUNE_DIR}/${ck}_samune.jpg`;
      const lensCode = http200_(lensUrl, URL_TIMEOUT_MS);
      const samuneCode = http200_(samuneUrl, URL_TIMEOUT_MS);
      sugSheet.appendRow([ck, lensUrl, lensCode, samuneUrl, samuneCode]);
    } else {
      if (manifestEntry.lens) {
        const code = http200_(manifestEntry.lens, URL_TIMEOUT_MS);
        urlSheet.appendRow([ck, 'manifest.lens', manifestEntry.lens, code, '']);
        if (String(code).startsWith('4') || String(code).startsWith('5') || String(code).startsWith('ERR')) {
          imgStatus = '⚠️';
        }
      }
      if (manifestEntry.samune) {
        const code = http200_(manifestEntry.samune, URL_TIMEOUT_MS);
        urlSheet.appendRow([ck, 'manifest.samune', manifestEntry.samune, code, '']);
        if (String(code).startsWith('4') || String(code).startsWith('5') || String(code).startsWith('ERR')) {
          imgStatus = '⚠️';
        }
      }
    }

    if (x) {
      if (looksLikeUrl_(x)) {
        const code = http200_(x, URL_TIMEOUT_MS);
        urlSheet.appendRow([ck, 'X列', x, code, '']);
        if (String(code).startsWith('4') || String(code).startsWith('5') || String(code).startsWith('ERR')) {
          imgStatus = '⚠️';
        }
      } else {
        imgStatus = '⚠️';
        urlSheet.appendRow([ck, 'X列', x, '-', 'Not a URL']);
      }
    } else {
      imgStatus = '⚠️';
      urlSheet.appendRow([ck, 'X列', '(empty)', '-', '']);
    }
  });

  const exitLine = [
    'EXIT-CRITERIA:',
    `schema${schema}`,
    `E/I/J/K一致${ckStatus}`,
    `画像リンク${imgStatus}`,
    `manifest連携${manifestStatus}`,
    `欠損=0${missingStatus}`,
    `除外${excludeStatus}`
  ].join(' ');

  Logger.log(exitLine);
  Logger.log(`欠損件数: ${missingCount}, 重複件数: ${dupCount}, manifest未一致: ${manifestMiss}`);

  const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
  logSheet.appendRow([
    timestamp, schema, ckStatus, imgStatus, manifestStatus, missingStatus, excludeStatus,
    missingCount, dupCount, manifestMiss, MANIFEST_URL
  ]);
}

function deriveCdnBase_(manifestUrl) {
  return manifestUrl.replace(/\/manifest\/manifest\.json$/, '');
}

function fetchJson_(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`manifest取得に失敗: HTTP ${code} (${url})`);
  }
  return JSON.parse(res.getContentText('utf-8') || '{}');
}

function looksLikeUrl_(s) {
  return /^https?:\/\//i.test(s);
}

function http200_(url, timeoutMs) {
  try {
    const res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'Range': 'bytes=0-0' }
    });
    return res.getResponseCode();
  } catch (e) {
    return `ERR:${e && e.message ? e.message.substring(0, 50) : 'unknown'}`;
  }
}

function ensureSheet_(ss, name, header) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(header);
  }
  return sh;
}
