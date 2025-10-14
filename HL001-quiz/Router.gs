// filename: Router.gs

/**
 * Webアプリのエントリーポイント
 */
function doGet(e) {
  try {
    e = e || { parameter: {} };
    var p = e.parameter || {};

    // API: getDashboardData (努力度ダッシュボード用)
    if (String(p.action || '') === 'getDashboardData') {
      var data = getDashboardData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // API: getDashboardSummary (管理者ダッシュボード用)
    if (String(p.action || '') === 'getDashboardSummary') {
      var period = String(p.period || 'monthly');
      var data = getDashboardSummary(period);
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ページ: 努力度ダッシュボード
    if (String(p.page || '') === 'dashboard') {
      return HtmlService.createTemplateFromFile('dashboard')
        .evaluate()
        .setTitle('努力度ダッシュボード')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // ページ: 管理者ダッシュボード
    if (String(p.page || '') === 'admin-dashboard') {
      return HtmlService.createTemplateFromFile('admin-dashboard')
        .evaluate()
        .setTitle('管理者ダッシュボード')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // デフォルト: ログイン画面
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('カラコンアカデミア')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
