# HL001 / HL002 連携プロジェクト コンテキスト
更新日: 2025-10-31 / ブランチ: feature/hl002-form-hl001-quiz

---

## 1. 現在のゴール
- HL001 (Apps Script 版) のクイズ機能・練習モードを完全維持したまま、HL002 で作成した新しいホーム画面 UI を取り込む。
- 既存の GAS デプロイ（例: Version 62, 2025-10-09 14:31）と同等の挙動を保つことが必須。
- UI 差し替え後も `google.script.run.getQuizQuestions()` → `QuizAPI.js` → `QuizLogic.js` → データマスタという呼び出しフローは変更しない。
- 動作確認は GAS デプロイ URL (https://script.google.com/macros/s/AKfycbwD_EAGsD4r4Coja_L2t6qyX-lyfjm_Asax_RGsxPpeU9xCcEZOBatfYFl2em_ImSbL/exec) で行う。

## 2. レポジトリ構成（抜粋）
```
HL001-quiz/                  # Apps Script 本体
├── index.html              # GAS から配信されるトップ+クイズ画面
├── QuizAPI.js              # getQuizQuestions() など GAS API
├── QuizLogic.js            # 問題生成・ヒント・スコア計算
├── Router.gs               # doGet/doPost, HTML テンプレ
├── manifest/               # 画像 CDN 管理
├── tools/                  # manifest/画像整合チェック、exit criteria 自動化
└── .sdd/                   # 仕様ドキュメント
HL002_prequiz/              # 新ホーム UI 試作（ローカル参考）
├── src/index.html          # 新ホームセクションのマークアップ
├── src/styles/main.css     # 背景・ロゴ・ボタンレイアウト
├── src/assets/             # login_background.png / login_logo.png / login_button.png
└── ka-soru/                # 旧軽量クイズ試作（ローカル JSON 参照）
```

## 3. 状況と履歴
- `HL001-quiz.backup-20251031-003910/` に現在の HL001 を丸ごとバックアップ済み。
- Git ブランチ `feature/hl002-form-hl001-quiz` を作成し、UI 差し替えをここで実施中。
- ローカル静的版 (HL002_prequiz/ka-soru) は参考実装。Apps Script を経由しないため `google.script.run` が使えず、本番と同じ動作は再現できない。
- ローカル JSON (`questions/questions.json`) はダミーであり、本番相当のマスタは `QuizLogic.js` + スプレッドシート。JSON をそのまま利用することはしない。
- 2025-10-31 時点でログイン画面は HL002 UI 素材（`global_screen_login_*`）に差し替え済み。ボタン・背景とも `images/screen_login.ui-assets/assets/` を参照し、`handleLogin()` のイベント配線は従来通り維持している。

## 4. UI 差し替え方針
1. HL001 の `index.html` にあるホームセクションを HL002 のロゴ／背景／ボタン UI へ置き換える。
   - ボタン押下イベントは既存 `startQuiz('practice')` / `startQuiz('daily')` などを呼び出す。
   - クラス名・ID を既存ロジックに合わせて維持する (`home-btn`, `quizPage`, `quizLoading` など)。
2. CSS は HL002 で使用したスタイルを `index.html` の `<style>` 内へ取り込み、既存スタイルと競合しないよう調整。
3. `clasp push` → テスト用 `clasp deploy -i <deploymentId>` で GAS 側に反映、バージョン 62 と動作比較。
4. 問題なければ新 UI 版を別バージョンとしてデプロイし、QA へ共有。

## 5. 関連 URL / コマンド
- GAS デプロイ (稼働実績) : https://script.google.com/macros/s/AKfycbwD_EAGsD4r4Coja_L2t6qyX-lyfjm_Asax_RGsxPpeU9xCcEZOBatfYFl2em_ImSbL/exec
- ライブラリアイテム: https://script.google.com/macros/library/d/1HIxgAXaDY_BZMXRVD5lXSQ5qaNxePqY4ASaYNi_6NUjLBT_Kl6Wp6o2n/62
- バックアップ作成例: `Copy-Item HL001-quiz HL001-quiz.backup-YYYYMMDD-HHmmss -Recurse`
- ブランチ作成: `git checkout -b feature/hl002-form-hl001-quiz`
- Apps Script 同期: `clasp pull` / `clasp push` / `clasp deploy -i <deployId> -d "UI refresh"`

## 6. 既存ワークフロー / 自動化
| カテゴリ | ファイル/仕組み | 内容 |
| --- | --- | --- |
| 画像整合性チェック | `tools/check_exit_criteria.js` | CSV・manifest・CDN の整合をチェックし exit_report を出力 |
| manifest 更新 | `tools/auto_update_manifest.js` + GitHub Actions | 正常な URL のみ manifest に反映し PR を自動生成 |
| URL 変換 | `tools/rebase_urls_repo_wide.js` | 生 GitHub URL → CDN URL へ一括変換 |
| データ更新ガイド | `docs/EXIT_CRITERIA_GUIDE.md` | データ更新時の最終チェックフロー |

## 7. このドキュメントの使い方
- ここに記載された構造・URL・コマンドを AI 共有用の前提知識として利用してください。
- HL001 のロジック改変は禁止。HL002 UI の取り込み中も `QuizAPI.js` / `QuizLogic.js` / `Router.gs` は変更しない。
- 作業ログや追加情報は本ファイルに追記すること。

## 8. 最新状況と課題（2025-10-31 夕方時点）
- ブランチ `feature/hl002-form-hl001-quiz` で作業中。`index.html` のログイン画面は HL002 素材（`images/screen_login.ui-assets/assets/global_screen_login_*.png`）に差し替え済み。`images/login_*` 旧素材もリポジトリに残存。
- `.claspignore` に `tools/**` を追加済み（`HL001-quiz/.claspignore`）。目的は Node 用スクリプト（`tools/auto_update_manifest.js` など）の GAS への push を防ぐこと。変更後、`clasp push` はまだ再実行していない。
- 直近の `clasp push` は `SyntaxError: Cannot use import statement outside a module line: 24 file: tools/auto_update_manifest.gs` で失敗。このファイルは Node (ESM) 想定のため Apps Script では動作不可。再実行時は `.claspignore` 反映版で push → version → deploy（固定 deploymentId）を行う必要がある。
- GAS 側に反映されていない変更：
  - `getUiBase()` など UI ベースURLを返す関数（Script Properties `UI_BASE_URL` を参照）が未デプロイ。現在フロントの `resolveImagePath()` はこの値を前提にしているため、本番環境では画像が 404 になる。
  - Router / QuizAPI は旧仕様（ログイン・履歴保存・ランキング対応）のまま。30万円スコープの「クイズ単体（10問のみ・保存なし）」へ縮退する作業は未着手。
- 未設定の項目：
  - Apps Script のプロジェクトプロパティ `UI_BASE_URL`。CDN（例: `https://cdn.jsdelivr.net/gh/<owner>/<repo>@<branch>/images/`）を設定し、未設定時は GitHub Raw を返すフォールバックを想定。
  - 10問固定データ（`questions/questions.json` or 配列）の整備と、差し替え手順をまとめた `docs/DATA_UPDATE.md` の更新。
- 今後の優先タスクリスト（ミニマム納品向け）：
  1. `clasp push` → `clasp version` → `clasp deploy --deploymentId <固定ID>` の再実行。
  2. GAS Script Properties に `UI_BASE_URL` を設定し、`getUiBase()`（もしくは同等処理）を Router 経由でフロントへ渡す。
  3. Router / QuizAPI をミニマム仕様（`doGet` で `index.html` を返す／`getQuizQuestions()` だけ提供）に整理。ログイン・履歴保存・ランキング関連コードはコメントアウトまたは除去。
  4. フロント（`index.html`）からログインフォーム・履歴保存ボタンなど未使用要素を無効化。`startQuiz()` → 10問出題 → 結果画面で正答率表示 → ホームに戻る流れだけを残す。
  5. 質問データの管理方法と差し替え手順を `docs/DATA_UPDATE.md` に追記し、クライアントへ引き渡す準備を整える。
- React / Node.js / Supabase を使った再実装（HL002 の上位プラン）については未着手。提案書を作る場合は上記ミニマム版と並行して検討。

## 9. 主要ファイル抜粋（現況把握用）
### `HL001-quiz/index.html` ログインUI差し替え部分（抜粋, L120-L220）
```html
.login-stage{
  width: min(400px, 92vw);
  aspect-ratio: 568 / 1009;
  margin: 0 auto;
  position: relative;
  display:flex;
  align-items:center;
  justify-content:center;
  background: url("images/screen_login.ui-assets/assets/global_screen_login_global_screen_login_haikei_01.png") center/cover no-repeat;
  border-radius: 28px;
  box-shadow: 0 24px 60px rgba(10,6,24,0.55);
  padding: clamp(28px, 6vw, 44px);
}
#loginBtn{
  width: min(320px,78%);
  aspect-ratio: 442 / 267;
  border: none;
  background: url("images/screen_login.ui-assets/assets/global_screen_login_global_screen_login_btn_01.png") center/contain no-repeat;
  cursor: pointer;
  color: transparent;
  text-indent: -9999px;
  overflow: hidden;
  transition: transform .2s ease, filter .2s ease;
}
```

### `HL001-quiz/index.html` ホーム～クイズDOM（抜粋, L520-L620）
```html
<div class="page active" id="loginPage" aria-label="ログインページ">
  <div class="login-stage">
    <div class="login-card glass-card frame" role="group" aria-labelledby="login-title">
      <img id="loginPanel" class="login-card__panel" src="images/screen_login.ui-assets/assets/global_screen_login_login_01.png" …>
      <div class="login-card__content">
        <img id="loginHero" class="login-hero" src="images/screen_login.ui-assets/assets/global_screen_login_image_01.png" …>
        <div class="logo-wrap">
          <img id="appLogo" class="app-logo" src="images/screen_login.ui-assets/assets/global_screen_login_rogo_01.png" …>
        </div>
        …
        <div class="login-actions">
          <button id="loginBtn" onclick="handleLogin()" aria-label="ログイン"><span class="sr-only">ログイン</span></button>
        </div>
        <div class="login-status">
          <div class="error" id="errorMsg" role="alert" aria-live="polite"></div>
          <div class="loading" id="loginLoading" aria-live="polite"><p style="text-align:center;margin-top:8px;">ログイン中...</p></div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- 以下 homePage / quizPage / resultPage / rankingPage / statsPage が旧仕様のまま残存 -->
```

### `HL001-quiz/QuizAPI.js`（抜粋）
```javascript
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
```

### `HL001-quiz/Router.gs`（抜粋）
```javascript
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
      return renderHtmlFile_('dashboard', { title: '管理者ダッシュボード' });
    }
    return renderHtmlFile_('index', { title: 'カラコンアカデミア' });
  } catch (err) {
    try { Logger.log('doGet error: ' + err); } catch(_) {}
    return HtmlService.createHtmlOutput('Error: ' + (err && err.message || err));
  }
}
```

### `HL001-quiz/0_config.gs`（抜粋）
```javascript
const CONFIG = {
  SHEET_IDS: {
    USERS: '1X0TyeI_1zER6xIceUDSbJX-GFbqvi2orAiSWHRXlC7M',
    MASTER: '1Uf2e0eXwcsQGjFtTtEeAWuYh74lh4fFE4NdjmyKHrj0',
    HISTORY: '1ShWXLvY9RimRYfsAkwoRyM2Bfwj4a3zVmr5bQc33-o0',
    RANKINGS: '1I2REcy2v5OpyzoY3k61kCzJ3SYKOBBCMxTLCeHWutT8',
    DASHBOARD: '1cfL0smJHoOAMp_H4IRsoUksoA0gBjksOKDfzJQjsjkc'
  },
  GITHUB_UI: {
    USER: 'y4m4usr',
    REPO: 'hl001-quiz-must1',
    BRANCH: 'main',
    UI_PATH: 'images/'
  },
  …
};

function getUiBase() {
  try {
    var g = CONFIG.GITHUB_UI;
    var base = 'https://raw.githubusercontent.com/'
      + g.USER + '/' + g.REPO + '/' + g.BRANCH + '/' + g.UI_PATH;
    return { success: true, base: base };
  } catch (e) {
    try { Logger.log('getUiBase error: ' + (e && e.message || e)); } catch (_) { }
    return { success: false, base: '' };
  }
}
```
