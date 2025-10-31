# CONTEXT — カラコンアカデミア（要約と運用基準）

本ドキュメントは、現在の実装状況・データ定義・運用手順・注意点をまとめた常設の参照資料です。新規の会話やメンバー追加時は、本書を前提として作業を進めてください。

## 目的と到達点
- ログイン機能の復旧（`google.script.run` の正規ハンドラみに統一）
- 統合版UIの確立（改善ホーム + v11クイズ）
- モード分離：練習（無制限）/ 本番（1日1回・ブラウザ制御）
- スコアロジックの統一（最大400点）
  - 正答率(最大100) + ボーナス(最大100) + タイム(最大200)
- 履歴保存の標準化（1問1行、セッション内訳は `metadata` に保存）
- ランキング（自己ベスト型）とマイ成績（直近10回）の可視化
- UX改善：グローバル・ローディング、ランキングタブ、練習用ボトムナビ

## フロントエンド構成（`HL001-quiz/index.html`）
- ページ構成：`loginPage` / `homePage` / `quizPage` / `resultPage` / `rankingPage` / `statsPage`
- モード制御：`currentMode` = `practice` or `daily`
- 本番モード1日1回：`localStorage.setItem('lastDailyQuiz_${userId}', toDateString())`
- ローディング：共通オーバーレイ（`showLoading()/hideLoading()`）を主要API呼び出しに適用
- クイズ結果表示：正答率/ボーナス/タイム/総合得点を内訳として表示
- 練習時のみボトムナビ（ホーム/ランキング/成績）を表示

### スコア算出（フロント）
- 正答率: `correctCount / totalQuestions * 100`
- ボーナス（各問）: ヒント0=+10, ヒント1=+5, ヒント2=+0（合計最大100）
- タイム: `max(0, 200 - Σ timeSpent)`
- 総合得点: `accuracy + bonusPoints + timeBonus`（最大400）

## バックエンドAPI（Apps Script）
- `AuthAPI.gs`：`authenticateUser(userId, userName)`
- `HomeAPI.gs`：`getHomeData(userId)`
- `QuizAPI.js`：`getQuizQuestions()`（v11整形に準拠）
- `HistoryAPI.gs`
  - `submitQuizAnswers(payload)`：履歴保存（1問1行）
    - A:historyId, B:timestamp, C:userId, D:mode, E:questionId, F:userAnswer,
      G:isCorrect, H:hintsUsed, I:timeSpent, J:score(各問), K:totalScore(セッション), L:metadata(JSON)
    - `updateUserPracticeCount(userId, mode)` を呼び出し（USERSシートの累計・最終日更新）
    - `updateRankings(payload)` を呼び出し（RANKINGS新定義で自己ベスト更新）
  - `updateUserPracticeCount(userId, mode)`：`USERS` or `users` シートに対応
  - `updateRankings(payload)`：RANKINGS（新版 A〜J）に自己ベスト＆累計回数反映
- `RankingAPI.gs`：`getRanking(scope)`（`daily`/`weekly`/`monthly`）
  - 同率判定：総合得点 → 練習回数 → USERS行番号 → タイムボーナス
- `StatsAPI.gs`：`getMyStats(userId)`（直近10回のスコア/正答率）
- `Router.gs`：`doGet`（`index.html`を返却）

## データ定義

### quiz_history（A〜L）
- A: `historyId`（例: `HIS_20251008_143000_EMP001`）
- B: `timestamp`（実行日時）
- C: `userId`
- D: `mode`（`practice`/`daily`）
- E: `questionId`
- F: `userAnswer`
- G: `isCorrect`（boolean）
- H: `hintsUsed`（0〜2）
- I: `timeSpent`（秒）
- J: `score`（各問スコア）
- K: `totalScore`（セッション総合得点）
- L: `metadata`（JSON: `{ accuracy, bonusPoints, timeBonus }`）

### USERS（A〜I）
- G: `totalPractice`（練習累計回数）
- H: `totalDaily`（本番累計回数）
- I: `lastDailyDate`（本番最終実施日）
  - 備考：列が存在しない場合は更新スキップ（動作は継続）

### RANKINGS（新版 A〜J）
- A: `userId` / B: `userName` / C: `store`
- D: `bestTotalScore` / E: `bestAccuracy` / F: `bestBonusPoints` / G: `bestTimeBonus`
- H: `totalPractice` / I: `totalDaily` / J: `lastPlayed`
  - `updateRankings(payload)` が自己ベスト更新時に上書き、未更新でも H〜J は更新

## デプロイ / 実行手順
1. 開発反映：`clasp push`
2. バージョン作成：`clasp version "<メモ>"`
3. デプロイ更新：`clasp redeploy <deploymentId>`
4. 検証：シークレットモードでWebアプリURLを開き、練習/本番/ランキング/成績を確認

## よくある落とし穴と対策
- RANKINGS ヘッダーが旧版（平均スコア型）のまま → 新版（A〜J）へ拡張必須
- USERS の G〜I が未整備 → カウント/日付更新はスキップ（機能は継続）
- 旧履歴（1行=1プレイ）と新履歴（1問1行）が混在 → 新形式前提で計算、旧行は無視/スキップ
- タイムゾーン：`Asia/Tokyo` 前提（Apps Script プロジェクト設定）
- 本番1日1回の制御は localStorage 依存 → 将来はサーバ側の `USERS.I` で補強可能

## 実装ポリシー / 運用ルール
1. 仕様差分は実装前に合意を取得（目的・影響・保存形式を明文化）
2. `google.script.run` 呼び出しは必ず success/failure ハンドラ付き
3. 変更は最小・局所的に。テスト→デプロイの順で進める
4. 重要UIは必ずローディングオーバーレイを伴わせる
5. シート列の追加/変更は本ドキュメントを先に更新し、コードへ反映

## 参考（現状の主なエンドポイント）
- フロント：`index.html`（モード切替・スコア算出・UI制御）
- 履歴保存：`HistoryAPI.gs#submitQuizAnswers(payload)`
- ランキング取得：`RankingAPI.gs#getRanking(scope)`
- 成績取得：`StatsAPI.gs#getMyStats(userId)`

---

更新履歴（抜粋）
- 統合版（改善ホーム + v11クイズ）をベースに再構成
- 履歴保存を1問1行に統一、RANKINGSを自己ベスト型へ移行
- 練習/本番モード分離、本番は当日2回目をブロック（localStorage）
- デプロイは clasp による push→version→redeploy 運用

## 2025-10-28 ログイン画面と UI アセットの是正内容
- index.html に `getUiBase()` 連携を復活させ、取得した UI_BASE から Noto Sans JP（woff2）と Figma エクスポート画像を一括適用する初期化フロー（bootUiBase）を実装。`fontNotoSansJP` スタイルタグ経由でプロジェクト規約のフォント要件を満たす。
- 本番クイズの「1日1回制限」を `toDateKey()/markDailyPlayed()` で実装し、localStorage のキー形式を ISO（日付）へ統一。結果確定時にも再記録してダブル起動を防止。
- 画像のフォールバックは従来どおり `images/` を使用しつつ、GAS から返る `{ success, base }` / 素の URL どちらにも対応するよう `updateUiBase()` を導入。
- UI ベース未設定時にフォントが読み込めない課題は残るため、Script Properties の `UI_BASE_URL` を必須で設定することを明文化（要: 管理者作業）。

### 他の AI が見落としていた原因
- 既存コードに `applyBackgrounds/applyHomeAssets` が残っていたため「UI連携済み」と誤認しやすかったが、`window.UI_BASE` が常に `'images/'` のまま上書きされておらず、GitHub Raw への接続が機能していなかった。
- Noto Sans JP は CSS の font-family に文字列だけが残っており、@font-face が無いことに気付きにくい。今回、ベース URL 決定後にスタイルシートへ注入する手順を追加した。
- daily 制限は旧 v10 系の toDateString 実装がコメントで残っていたため、実装済みと錯覚されていた。ISO 形式キーとラッパー関数を導入して、処理箇所を一元化した。

## 2025-10-29 Figma Export Plugin 拡張
- `docs/figma-plugin/export-codex-layout/*` を刷新し、レイアウト JSON に以下のメタデータを追加：`semanticRole` 推論、Auto Layout/constraints 由来の `responsiveSpec`、プロトタイプ `interactionMap`、テキスト `a11y.contrast`。
- レイヤー description + コメントを `[comments]` ブロックとして `metadata.designNote` に統合。`layout.meta.commentSummary` でコメント件数と対象レイヤー数を UI 上に表示。
- 画像アセットごとに SHA-256 ハッシュを計算し、プレビュー含め全てのバイナリを差分検知可能にした。UI からは PNG/JPG/WebP への再エンコード（オリジナル保持）が可能。
- `css-template` レイヤーには `metadata.cssSnippet` と低解像度プレビュー (`cssPreviewBase64/hash`) を付与し、HTML/CSS 移植の叩き台を提供。
- Figma コメント REST API にアクセスするためのトークン保存導線を追加。`clientStorage` / shared plugin data 双方に保持し、未設定時は静かにスキップする仕様として明文化。

## 2025-10-30 Figma プラグイン ES5 ビルド体制
- プラグイン実装は `docs/figma-plugin/export-codex-layout/code.js` を編集し、`tsconfig.build.json` を利用して `npx tsc --project tsconfig.build.json` で ES5 化した `build/code.js` を生成するフローに統一。`build/code.js` 先頭に `var __awaiter` などが出力されることを更新完了の目印とする。
- トランスパイル用の TypeScript を devDependencies に追加済み（プロジェクト直下で `npm install --save-dev typescript`）。ビルド前に `npm ci` を行えば依存が揃う。
- プラグインの再配布時は `build/code.js` / `ui.html` / `manifest.json` / 画像アセットをまとめて zip 化し、同じ manifest ID (`1564290291107280052`) にアップロードする手順に固定。
- `npx tsc` を誤ってユーザールートで実行するとグローバル `package.json` に影響するため、必ず `docs/figma-plugin/export-codex-layout/` ディレクトリでコマンドを実行するルールを明記。
