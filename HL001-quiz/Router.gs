// filename: Router.gs

var HTML_CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours
var HTML_CACHE_VERSION = 'v1';

/**
 * Webアプリのエントリーポイント
 */
function doGet(e) {
  try {
    e = e || { parameter: {} };
    var p = e.parameter || {};
    if (String(p.action || '') === 'getDashboardData') {
      var data = getDashboardData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (String(p.page || '') === 'dashboard') {
      return renderHtmlFile_('dashboard', {
        title: '管理者ダッシュボード'
      });
    }
    return renderHtmlFile_('index', {
      title: 'カラコンアカデミア'
    });
  } catch (err) {
    try { Logger.log('doGet error: ' + err); } catch(_) {}
    return HtmlService.createHtmlOutput('Error: ' + (err && err.message || err));
  }
}

/**
 * APIルーター
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    let result;

    switch (action) {
      case 'login':
        result = authenticateUser(params.userId, params.userName);
        break;

      case 'home':
        result = getHomeData(params.userId);
        break;

      default:
        result = { success: false, message: '不明なアクション' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('doPost エラー: ' + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'サーバーエラー',
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

function renderHtmlFile_(fileName, options) {
  options = options || {};
  var cache = CacheService.getScriptCache();
  var cacheKey = ['html', HTML_CACHE_VERSION, fileName].join(':');
  var cachedHtml = cache.get(cacheKey);
  var output;

  if (cachedHtml) {
    output = HtmlService.createHtmlOutput(cachedHtml);
  } else {
    var evaluated = HtmlService.createTemplateFromFile(fileName).evaluate();
    var html = evaluated.getContent();
    output = HtmlService.createHtmlOutput(html);
    try {
      cache.put(cacheKey, html, HTML_CACHE_TTL_SECONDS);
    } catch (cacheErr) {
      try { Logger.log('renderHtmlFile_ cache error: ' + cacheErr); } catch(_){ }
    }
  }

  if (options.title) {
    output.setTitle(options.title);
  }
  output.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
