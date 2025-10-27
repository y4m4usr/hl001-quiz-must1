# 実装タスクリスト

## セクション1：データモデル実装
- [ ] 1.1 AppStateとクイズ/履歴ペイロードの型を定義する
  - design.md「データ構造」「フロントエンド」記載のAppState（user/quiz/mode）とQuestionPayload（questionId, imageUrls, options, hints, answerKey）を実装
  - HISTORYメタデータ（JSON）とUSERSプロファイル（streak/level/points）について、取り込み時の整合性チェックを実装
- [ ] 1.2 Google Sheetsアクセス層を実装する
  - DataAccess/Config周りでUSERS/HISTORY/RANKINGSシートをID経由で参照する処理をdesign.md「データモデル」「データフロー」に沿って整備
  - 取得・書き込み時に列定義とバリデーションを行い、欠損データはエラーとして扱う

## セクション2：ビジネスロジック実装
- [ ] 2.1 QuizLogicのクイズ生成フローを実装する
  - design.md「データフロー > クイズ」「QuizLogic」の処理フロー1-3に対応し、generateQuestions_/buildQuestionPayloadでdaily/practice両方の出題を構築
  - タイマー（20秒）制御・ヒント/スコア計算に必要なUI連携フックをquizControllerに組み込む
- [ ] 2.2 HistoryAPIと経験値更新ロジックを実装する
  - design.md「データフロー > 履歴」「HistoryAPI」「awardExperienceAndRank」の処理フロー4-6を満たすsubmitQuizAnswers/calculateScoreBreakdown/awardExperienceAndRankを実装
  - sessionId重複検知、streakブースト、EXP/RP算出を設計通りに反映しUSERS/HISTORYへ書き戻す
- [ ] 2.3 エラーハンドリングを実装する
  - design.md「エラーハンドリング」記載のtry-catchとwithFailureHandler戦略を全API/Routerに組み込み、ログ出力とユーザー通知を実装

## セクション3：インターフェース実装
- [ ] 3.1 UIコンポーネント/APIエンドポイントを作成する
  - index.htmlのログイン/クイズ/マイメニュー画面とdashboard.htmlの管理者ビューをdesign.md「フロントエンド」仕様通りに構築
  - Router.doGet/doPostでpage=dashboard分岐とitems/submit/ranking/mystats/healthエンドポイントを結線する
- [ ] 3.2 入力バリデーションを実装する
  - ログインフォームのID/PASSWORD確認とmode（daily/practice）選択をクライアント側でチェックし、不正値はエラー表示する
  - submitQuizAnswers payloadについて回答数10件・タイムスタンプ・mode等をApps Script側でバリデーションする
- [ ] 3.3 出力フォーマットを実装する
  - QuizLogic/HistoryAPI/RankingAPIのレスポンスをdesign.mdで定義されたJSON構造（user/stats/score breakdown）で整形
  - dashboardView/getMyStats/getRankingの結果をUIテーブル・カード表示へマッピングし、EXP/RP/レベルをリアルタイム更新する
- [ ] 3.4 Figmaプラグインとアセット同期パイプラインを統合する
  - Figmaエクスポートプラグインがlayout JSONの`imageId`と同じ命名規則でPNGをリネームし、Zipにまとめる処理を整備
  - プラグインUIに「`codex ui-assets sync ./exports/<layout>.zip` を実行」といった指示を表示し、Codex/CloudCodeがZipをGitHubへアップロード→GASデプロイまで自動実行できる状態にする
  - layout JSONには参照画像ID/section/areaを必ず残し、WebクライアントがGitHub Raw経由で正しい画像を取得できることを確認する

## セクション4：統合とテスト
- [ ] 4.1 コンポーネントを統合する
  - quizController -> google.script.run -> Router -> Apps Script各API -> Google Sheetsの流れを設計通りに結合し、AppState更新とUI反映を確認
  - daily/practice両モードでUSERS/HISTORY/RANKINGSが期待通り更新されるかデータフローを通しで点検
- [ ] 4.2 基本的な動作テストを実装する
  - QuizLogic/HistoryAPI/awardExperienceAndRankの単体テストやApps Script実行テスト（Google側 Test スクリプト）を作成し、主要分岐をカバー
  - フロントエンド側はdailyログインから結果表示までのE2Eテストシナリオ（クイック操作/エラーパス）を準備
- [ ] 4.3 要件の受入基準を満たすことを確認する
  - requirements.mdのシナリオ（ログイン、daily quiz、practice、ランキング、dashboard、エラーハンドリング）を順に検証
  - UI応答時間（3秒以内）、API p95 < 400ms、ログ出力、セキュリティ要件（CSP/i18n）の遵守を確認
