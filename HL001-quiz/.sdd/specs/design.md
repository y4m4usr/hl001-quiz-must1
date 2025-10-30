# 技術設計書（phase1-core-quiz）

## アーキテクチャ概要
- Google Apps Script (V8) をバックエンド、Apps Script HTML Service をフロントエンドとするサーバーレス構成。
- HTML テンプレート内で Vanilla JS を実行し、`google.script.run` 経由で Apps Script API を呼び出す。
- データソースは Google Sheets。ログイン・問題・履歴・ランキングを全て同一スプレッドシート群で管理する。
- クライアント/サーバー双方で状態を管理し、Apps Script の実行時間制限（6分）内で全処理が完結するようにする。

## コンポーネント構成

### フロントエンド
- **`index.html`**
  - ログイン画面、ホーム（称号・ステータス表示）、本番/練習クイズ UI、結果画面、マイ成績ビューを内包。
  - `AppState`（JS オブジェクト）で `user`, `quiz`, `mode` などの状態を保持する。
  - `quizController` が問題取得、回答送信、タイマー制御、ヒント表示、演出を司る。
  - `dashboardView` が `getMyStats` API のレスポンスを整形してテーブル・棒グラフを描画する。
- **`dashboard.html`**
  - 管理者向け別画面。ランキングや学習集計を表示。Apps Script テンプレートで `getDashboardData` を埋め込む。

### サーバー（Apps Script）
- **`Router.doGet/doPost`**: ルーティング。`page=dashboard` の場合は管理画面 HTML を返却、それ以外は `index.html` を返却。POST は `action` に応じて API をディスパッチ。
- **認証系 (`AuthAPI.gs`, `UserManagement.gs`)**
  - `authenticateUser(userId, passwordOrName)` で USERS シートを照合し、称号・streak・level を含むユーザープロフィールを返す。
  - `awardExperienceAndRank` が回答セッション単位で level / points / streak / titles を更新。
- **クイズ出題 (`QuizAPI.js`, `QuizLogic.js`)**
  - `generateQuestions_(count)` が商品シートから候補を抽出し、正解を含む4択を生成。
  - `buildQuestionPayload` が UI 用に {questionId, imageUrls[左右], options[], hints[], answerKey} を整形。
  - 練習/本番モードは `mode` 引数で分岐し、本番では当日重複回避ロジック・制限チェックを行う。
- **履歴保存 (`HistoryAPI.gs`)**
  - `submitQuizAnswers(payload)` が 10問分の回答とセッションメタ情報を受け取り、HISTORY シートへバルク書き込み。
  - `buildHistoryRows` がスキーマ（v11）に沿って配列を生成し、metadata 列に JSON 文字列を格納。
  - 重複送信対策として `sessionId` とタイムスタンプを確認し、既存エントリがあれば上書き/キャンセルする。
- **集計 (`DashboardAPI.gs`, `DashboardAggregation.gs`, `EffortAggregation.gs`)**
  - `getMyStats(userId)` が直近10セッションを HISTORY から抽出し、score breakdown とグラフ用データを返却。
  - `aggregateUserEffort()` が練習回数を集計し、ダッシュボードカードに表示する総練習回数を維持。
- **ランキング (`RankingAPI.gs`, `RankingWriter.gs`)**
  - `updateRankingsAllScopes()` が scope=weekly/monthly/yearly の3種類を生成し、rankings シートへ書き込み。
  - `getRanking(scope)` が UI 表示用に上位ユーザーを返却。

## データモデル

### USERS シート
| column | description |
| --- | --- |
| userId | ログイン ID（店内発行） |
| password | 認証用キー（現行は簡易パスワード or 名前照合） |
| name | 表示名 |
| store | 店舗情報 |
| level | 現在のレベル |
| points | 累積 EXP |
| streak | 連続日数 |
| lastDailyDate | 最終本番プレイ日 |
| totalDaily | 本番累計回数 |

### HISTORY シート（v11）
| column | description |
| --- | --- |
| historyId | 連番 ID |
| timestamp | セッション開始/終了タイムスタンプ |
| userId | プレイヤー |
| mode | `daily` or `practice` |
| questionId | 商品ID |
| isCorrect | 正誤 |
| hintsUsed | 使用ヒント数 |
| timeSpent | 消費秒数 |
| score | 問題単位スコア |
| totalScore | セッション合計スコア |
| metadata (JSON) | accuracy, hintBonus, timeBonus, expEarned, rpEarned, streakAfter, boost, levelAfter, pointsAfter など |

### RANKINGS シート
| column | description |
| --- | --- |
| scope | `weekly` / `monthly` / `yearly` |
| rank | 順位 |
| userId | スタッフ ID |
| userName | スタッフ名 |
| bestScore | スコア（200 点満点） |
| practiceCount | 自主練回数 |
| updatedAt | 集計日時 |

## 主要フロー

### ログイン
1. `index.html` のフォームから ID / PASSWORD を送信。
2. `google.script.run.withSuccessHandler(handleLogin)` → `Router.doPost` → `authenticateUser`.
3. 成功時にユーザープロフィール（称号、streak、今日の本番残数）を返す。
4. フロント側でホーム画面に切り替え、プロフィールカードを描画。

### 本番クイズ
1. `startQuiz('daily')` で `getQuizQuestions` を呼び出し、`QuizLogic.generateQuestions_` が問題セットを返す。
2. `quizController` が 10問分の状態を初期化し、タイマー（20秒）開始。
3. 回答ごとに `evaluateAnswer` → UI フィードバック → 次の問題へ。
4. 全問終了後、`submitQuizAnswers` へ payload (answers, totalScore, accuracy, hints, times, sessionId) を送信。
5. API が HISTORY 保存 → `awardExperienceAndRank` → レスポンスに最新の level / title / streak を含める。
6. フロントで結果画面表示。EXP/RP の増加量、レベルアップ演出、次の挑戦可否を表示。

### 練習モード
フローは本番と同じ。ただし streak ブーストや RP 付与は軽減され、daily 残数には影響しない。送信 payload の `mode` を `practice` にする。

### ダッシュボード & ランキング
1. マイ成績タブ表示時に `getMyStats(userId)` を呼び、直近10プレイと棒グラフ用データを取得。
2. ランキングタブでは `getRanking(scope)` を呼び、`weekly` を初期表示として select UI で切り替える。
3. `updateRankingsAllScopes` は管理者操作またはトリガーで実行し、rankings シートを更新する。

## エラーハンドリング
- 全 API で try-catch を実装し、`Logger.log` と JSON レスポンス（`success:false` + message）を返却。
- フロント側は `withFailureHandler` or catch でエラー表示。ネットワーク再送が必要な場合は再試行ボタンを提示。
- 重複送信防止: `submitQuizAnswers` が `sessionId` + `userId` + `mode` をキーに検出し、既存レコードがあれば `409` 相当のエラーを返す。

## バリデーション
- 問題生成時: 同一セッションで同じ `product_id` が複数出題されないよう、生成前にシャッフル + `Set` で排除。
- スコア計算: 1問あたりのヒントボーナス上限（5点→0点）とタイムボーナス（最大50）を計算関数で一元管理。
- streak: `lastDailyDate` と比較し、当日・翌日・途切れの3パターンをユーティリティ関数で判定。

## UI/UX ポイント
- モバイル基準でのレスポンシブデザイン（幅 ~390px）。`--s` スケール変数でフォント/余白を制御。
- タイマーが 5 秒以下でアニメーション（`timer.warning`）、正解・不正解でカード色を切り替える。
- 結果画面で EXP/RP 増加量とレベルアップ演出を明示し、モチベーションを喚起。
- ホーム画面のボタンで本番・練習・マイ成績・ランキングへ遷移。`Top` ボタンはクイズ終了後のみ表示。

## トリガー / 運用
- Apps Script トリガーで `updateRankingsAllScopes` と `aggregateUserEffort` を日次/週次で実行する。
- 新問題の追加・画像差し替えは商品スプレッドシートを更新し、GAS 側でキャッシュ初期化する。
- バージョン管理は `clasp` を利用し、デプロイ時に固定 WebApp URL を更新。

## 保守性への配慮
- シート名変更に備え、`Config` スクリプトでシート ID / 名前を集中管理。
- 共通処理（行検索、JSON stringify）は `DataAccess.js` などにまとめ、重複コードを避ける。
- フロントロジックもコントローラ、ビュー補助関数、状態管理を明示し、タスク分割とテストが行いやすい構造にする。
