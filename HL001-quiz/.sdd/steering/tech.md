# 技術スタック

## クライアント
- Google Apps Script HTML Service 上の `index.html` / `dashboard.html`
- Vanilla JavaScript + HTML テンプレート（フレームワーク非使用）
- CSS は各 HTML 内に直接記述（外部ビルド無し）
- UI 画像アセットは `images/` 配下（`images/UI/home/*` 等）から参照

## サーバー（Apps Script）
- V8 ランタイムの Google Apps Script (`appsscript.json`)
- 主要スクリプトファイルは `.gs` / `.js`（ES2015 互換）で構成
- `Router.gs` が `doGet`/`doPost` を公開し、ページ遷移と API ルーティングを担当
- クイズロジック、成績集計、ランキング更新などは専用モジュール（`QuizLogic.js`, `HistoryAPI.gs`, `EffortAggregation.gs` 等）に分割

## データストア
- Google Sheets を単一のデータベースとして利用
  - USERS: ユーザー情報、レベル、streak
  - TITLES: レベル帯と称号のマッピング
  - HISTORY: 回答ログ（v11 形式、metadata JSON 列を含む）
  - RANKINGS / USER_EFFORT_STATS などの集計シート
- 画像 URL は Google Drive 内の既存資産を利用（スプレッドシートに保存）

## 認証・ホスティング
- Apps Script Web App としてホスティング（`doGet` が HTML を返却）
- WebApp `access: "ANYONE_ANONYMOUS"`（`appsscript.json`）のため IP 制御や追加認証レイヤーは別途実装で補完
- ログインはシンプルな ID + 名前照合を `UserManagement.gs` 系で処理

## テスト / デバッグ
- 単体テスト向けに `TestQuiz.js`, `TestRankingAPI.gs` 等のスクリプトが同梱（Apps Script の `Execution` で実行）
- `DebugSheetNames.gs` など、シート名の検証ユーティリティを内包

## 依存ライブラリ・ビルド
- npm / bundler 不要。外部依存パッケージは現時点で使用していない。
- 画像加工や UI 用の外部 CDN も未使用。必要に応じて HTML 内 script タグで追加可能。
