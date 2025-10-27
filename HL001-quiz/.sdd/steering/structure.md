# プロジェクト構造

```
HL001-quiz/
├── appsscript.json          # Apps Script プロジェクト設定
├── *.gs / *.js              # サーバー側ロジック（GAS）
├── *.html                   # クライアント UI テンプレート
├── images/                  # UI 画像アセット
└── docs/                    # 仕様書・デザイン・調査資料
```

## サーバー側モジュール
- `Router.gs`: `doGet`/`doPost` エントリーポイント。ページ配信と API ルーティングを担当。
- `AuthAPI.gs` / `UserManagement.gs`: ログイン認証、ユーザー情報取得、称号/レベル更新などを行う。
- `QuizAPI.js` / `QuizLogic.js`: 出題ロジック、選択肢生成、正答判定。
- `HistoryAPI.gs`: 回答ログの保存、メタデータ構築（正答率・ヒント利用・EXP/RP など）。
- `RankingAPI.gs` / `RankingWriter.gs`: 週/月/年ランキング生成、シート出力。
- `DashboardAPI.gs` / `DashboardAggregation.gs`: 個人ダッシュボード向け集計、グラフ用データ提供。
- `StatsAPI.gs`, `EffortAggregation.gs`: モード別統計や学習努力量（practice 回数）を算出。
- `DataAccess.js`: シート操作の共通ラッパー（ID 管理、抽象化）。
- `ImageUtil.js`: 画像パスの補助（Drive URL 変換など）。

## クライアント側テンプレート
- `index.html`: ログイン～ホーム～クイズ UI を含むメイン画面。Apps Script のテンプレートで挿入される。
- `dashboard.html`: 管理者ダッシュボード UI。集計値やランキングを表示。
- HTML 内で `<script>` によるクライアントロジックを定義し、`google.script.run` を通してサーバー API を呼び出す。

## 補助ファイル
- `docs/読み解くプロジェクト記録/`: 過去バージョン仕様書、運用ノート、スプレッドシート構成。
- `docs/` 配下 PDF/画像: 画面デザイン、遷移図、参考資料。
- `Test*.gs/js`: Apps Script 内部で呼び出す開発者向けテスト/検証スクリプト。

## データフロー概要
1. ユーザーが `index.html` からログイン → `doPost` → `UserManagement` が USERS シートを検証。
2. ホーム画面でクイズ開始 → `QuizAPI.getQuizQuestions()` が商品スプレッドシートから問題セットを組成。
3. 回答結果を `HistoryAPI.submitQuizAnswers()` に送信し、HISTORY シートへ保存 → `awardExperienceAndRank` でレベル/称号更新。
4. `DashboardAPI` / `RankingAPI` が定期またはオンデマンドで集計し、`dashboard.html` に表示。

## 今後の拡張ポイント
- フェーズ2以降の管理者ダッシュボード拡張に備え、`dashboard` 系 API をモジュール単位でリファクタリング可能。
- 練習モード／本番モード別のロジックは `QuizLogic` で分岐。追加問題形式が必要になった場合は同モジュールを拡張する。
