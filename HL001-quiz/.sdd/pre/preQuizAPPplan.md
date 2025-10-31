
# アプリ実装計画（簡易版クイズ）

## 1. スコープ確認（本日午前：15分程度）

- **ログイン無し：** アクセスすると即ホーム画面が表示される。
- **ホーム画面：** タイトルロゴ（テキストでも可）＋「ゲームを開始」ボタンのみ。CSSも最小限。
- **ゲームプレイ：**
    - 既存のクイズロジックからタイマー／ヒントを削除し、「画像と選択肢（最大4）」だけ表示。
    - GitHub Raw URL から画像取得。
    - 10問固定。回答を選択したら自動で次の問題へ。
- **結果画面：** 正答率（例：「あなたの正解率 70%」）のみ表示→トップ画面へ戻るボタン。
- **データ保存・ランキングなど：** すべて無し。必要ならコード内にフックだけ残す。
- **納品物：** index.html（必要なら main.css と軽量 JS）、Apps Script（Router／QuizAPI／Config）、最小仕様メモ・テストメモ。

## 2. コード整理とつなぎ込み（本日午後～明日午前）

- これまでコラボで作ったApps Script／フロントの断片コードを確認し、不要なファイルや処理を除外。
- QuizLogic で使用中のタイマー制御・ヒントロジック・streak 更新を削除し、質問→答え判定→カウント のみに縮約。
- 画像URLはGitHub上の静的JSONや配列に格納し、getQuizQuestions() で10問を返す形に整理。
- Router／HistoryAPIなどは単一エンドポイント（クイズ取得・結果送信）に限定。結果保存は不要ならstub化。

## 3. フロントエンド最小構成（本日夕方～明日午前）

- index.html 1枚で以下のセクションを持つ：
    - `homeSection`：タイトルと「プレイ開始」ボタン。
    - `quizSection`：画像と選択肢ボタンを表示。問題番号・残り問数が分かる程度に簡易表示。
    - `resultSection`：正答率と「トップに戻る」ボタン。
- CSSは簡潔に（中央寄せ・ボタン色など最低限）。要望があればブランドカラーを反映。
- JSは以下の流れ：
    - `startGame()` で `homeSection` を隠し `quizSection` 表示。Apps Scriptから問題をフェッチ。
    - 選択肢クリックで正誤判定 → カウント → 最後に正答率算出 → `resultSection` 表示。
    - 「トップに戻る」でホームへ戻り、再プレイ可能。
- PC/モバイル双方で最低限崩れないことを確認（横幅調整、ボタンサイズ）。

## 4. テスト・納品準備（明日午後）

- Chrome（PC）とスマホ1台で全問回答→結果表示まで確認。
- 質問データの差し替え方法をMarkdown1枚でまとめる（例：QUESTIONS シートまたはJS配列更新手順）。
- テスト結果はチェックリスト形式で記録。
- ソースコード、Apps Script の push 方法、簡易デプロイ手順をドキュメント化。

## 5. 納品（明日夕方を目安）

- コード一式＋手順書を zip 化して共有、または GitHub／Drive 経由で共有。
- オンラインで10～15分の納品確認（PC画面共有で動作確認）。
- 納品後1週間程度は軽微な修正（文言変更・リンク差し替えなど）に無償対応、以降は都度見積もり。

---

# 全体スケジュールとAI担当

## 全体スケジュール（今日〜明日）

1. **トップ画面のHTML/CSS制作**
    - **担当AI：** ChatGPT
    - **指示例：** 必要素材（タイトルロゴ画像や文言）を事前に共有。「HTMLベースで、タイトルと『ゲームを開始』ボタンのみ配置、レスポンシブ対応で」など要件を明記
    - **納品形式：** index.html のホーム部分＋インラインCSS（または main.css の初期版）
2. **ゲーム画面ロジック組み込み（既存ロジックの改修）**
    - **担当AI：** Codex
    - **指示例：** 「QuizLogic.js からタイマー／ヒントを削除し、名前当て専用に縮約する」「Router.gs、QuizAPI.js を最小構成に調整」「GitHub Raw URL から画像を取得する配列／JSONを準備」など
    - **納品形式：** Apps Scriptの該当ファイル（差分・全体）
3. **ゲーム画面UI（問題表示・選択肢部分）のHTML/JS整備**
    - **担当AI：** ChatGPTまたは別AI
    - **指示例：** 「ホーム→クイズ→結果の切替コードを記述」「選択肢をクリックしたら正誤判定を行い、10問終了後に正答率を表示」
    - **納品形式：** index.html 内の `<script>` 部分／quiz.js ファイル
4. **結果画面・トップへ戻る動線の実装**
    - **担当AI：** ChatGPT
    - **指示例：** 「正答率表示と『トップへ戻る』ボタンを追加し、状態をリセットする処理を記述」
    - **納品形式：** UIとJSの差分
5. **テストチェックリスト作成**
    - **担当AI：** Claude（レビュー寄りAI）
    - **指示例：** 「Chrome/スマホでの操作手順とチェック項目を整理」「データ更新手順メモのテンプレートを作成」
6. **納品パッケージ整備**
    - **担当AI：** 必要に応じて（例：Notionやドキュメント生成AI）
    - **指示例：** 「最終納品物一覧（HTML/CSS/Apps Scriptファイル・テストログ・手順書）をドキュメント化」

---

# 各AIへの指示テンプレート

## トップページ制作（ChatGPT）

`タイトルロゴ画像：/assets/logo.png
文言：カラコン名前当てクイズ
要件：
- HTMLベース
- 全体中央寄せ、背景#F6F6F6
- 「ゲームを開始」ボタンを設置（id="startButton"）
- CSSは `<style>` 内に併記
- レスポンシブ（スマホ幅で文字サイズ・余白調整）

出力：`index.html` のトップセクション（<body>～</body>）だけでOK`

## ゲームロジック簡素化（Codex）

`対象ファイル：QuizLogic.js / QuizAPI.js / Router.gs
要件：
- タイマー関連コードの削除
- ヒント処理の削除
- 10問固定で `getQuizQuestions()` が { imageUrl, choices[], answer } を返すように
- Router.gs は page=index のみ配信、結果保存は行わない
- 画像URLは GitHub Raw を使う。プレースホルダでも可。

出力：各ファイルの差分（または全体）`

## ゲーム画面UI/JS（ChatGPT）

`仕様：
- HTMLに <section id="quizSection"> を追加
- 画像表示：<img id="quizImage">
- 選択肢ボタン：<button class="choice-button">4つ
- JSで fetchQuiz() → 配列に保存 → showQuestion()
- 回答後はカウントを進め、10問終わったら showResult()

出力：`index.html` 該当部分＋ <script> のJSコード`

## 結果画面実装（ChatGPT）

`仕様：
- <section id="resultSection"> を追加
- 正答率を表示（例：<p id="resultText"></p>）
- 「トップへ戻る」ボタンで start screen に戻る処理
- ゲーム状態のリセット（currentIndex, correctCount など）

出力：HTML+JSコード`

## テストチェックリスト（Claude）

`項目：
- PC（Chrome）とスマホ（iOS or Android）で操作手順
- 正答／誤答を含むテストケース
- 画像が表示されない場合の簡易確認
- データ差し替え手順（QUESTIONSシート or JSON）

出力：Markdown形式`

## （補足）トップページ制作AI（例：ChatGPT）への指示案（ボタン画像指定版）

`【素材】
- タイトルロゴ画像: /assets/logo.png
- プッシュボタン画像: /assets/btn_play.png

【要件】
- HTMLベースでトップページを作成
- 画面中央にロゴを配置
- ロゴの下に「プレイ」というテキスト付きボタンを設置
  - ボタン背景に /assets/btn_play.png を使用
  - CSSでホバー／クリック時に押し込み感が出る演出（box-shadow、transform など）を付ける
- 全体はレスポンシブ（スマホ幅に応じて余白・サイズ調整）
- CSSは `<style>` 内、もしくは別ファイル `main.css` にまとめる（どちらでも可）
- 出力は `index.html` のトップセクション（<body>～</body>）＋スタイル部分のみでOK`

## （補足）ゲーム画面のデザイン（サイバーパンク化）指示案

`【素材】
- 画像表示：既存の <img id="quizImage"> を使用（GitHub RawのURL）
- 選択肢：<button class="choice-button"> を4つ（構造は現状のまま）
- 結果表示：<section id="resultSection"> に正答率のみ表示

【要件】
1. 画面全体をサイバーパンク風にデザイン
   - 背景にダーク＋ネオンカラーのグラデーションやグリッドを追加
   - フォントはSF系（例：Orbitron、Exo など）または擬似的にCSSで表現
   - 選択肢ボタンにネオン風の外枠（box-shadow、border）、ホバー時に色相変化
   - 進行状況表示（「QUESTION 3 / 10」など）もネオンラインで飾ると◎

2. タイマー／ヒント要素は完全に削除
   - HTML内にタイマーやヒントに関するDOMが残っていれば削除
   - JSでもタイマー制御、ヒント処理を呼んでいる箇所があれば削る

3. 結果画面は正答率のみ表示
   - <p id="resultText"> に「正答率 80%」のような文言を表示
   - 「トップへ戻る」ボタンだけ残し、他の詳細は表示しない

4. CSSは <style> 内でも別ファイルでも構いませんが、差し替えやすいようにまとめてください
   - 例：`.cyber-bg`クラスをbodyに付与し、背景やフォントを制御
   - 選択肢ボタンの押下感・アニメーションもサイバーパンク調で演出

【出力】
- `index.html` の `quizSection`・`resultSection` を含むHTML/CSS
- 必要に応じて `<script>` 内の該当部分（タイマー／ヒント削除、結果表示調整）も提示`

---

# 最終計画とAIプロンプト（新規リポジトリ版）

## 1. 作業フローと担当AI

| **Phase** | **目的** | **主担当** | **備考** |
| --- | --- | --- | --- |
| 1. トップ画面実装 | ロゴ＋「プレイ」ボタンのみのホーム画面 | ChatGPT | 既存素材を適用、押下感をCSSで演出 |
| 2. クイズロジック簡素化 | タイマー／ヒントを削除し名前当て専用API化 | Codex (Apps Script) | 画像はGitHub Raw配信、10問固定 |
| 3. ゲーム画面UIサイバーパンク化 | HTML/CSS/JSで問題表示・選択肢・結果画面を構築 | ChatGPT | 既存構造は維持しつつデザイン刷新 |
| 4. テストチェックリスト & 手順書 | 動作確認項目・データ更新手順 | Claude | Markdown形式でまとめる |
| 5. リポジトリ初期化・配置 | 新規GitHubリポジトリにコードを整理 | Codex または CLI | 既存ファイルの必要部分のみを配置 |
| 6. 最終パッケージ作成 | 納品フォルダ・説明書類・テストログ整備 | ChatGPT / Claude | README, 納品手順を整える |

## 2. 各AIへのプロンプト例

### A. トップページ（ChatGPT）

`あなたはフロントエンドエンジニアです。以下の条件でトップ画面のHTML/CSSを作成してください。

【素材】
- タイトルロゴ画像: /assets/logo.png
- ボタン画像: /assets/btn_play.png
- 表示テキスト: 「プレイ」

【要件】
1. ページ中央にロゴ、その下に「プレイ」ボタンを配置
2. ボタン背景に /assets/btn_play.png を適用し、hover / active 時に押し込む演出（transform, box-shadow など）を追加
3. 背景は #F6F6F6、全体を中央に配置。スマホ幅でも崩れないようレスポンシブ対応
4. CSSは `<style>` 内で完結させてもOK。`body`, `.home-container`, `.play-button` などのクラス名を使用
5. `<section id="homeSection">` 内で完結させ、後で他のセクションと統合しやすいようにする

出力は `<body>～</body>` と `<style>～</style>` のコードを提示してください。`

### B. クイズロジック簡素化（Codex）

`対象: Apps Script プロジェクト（QuizLogic.js, QuizAPI.js, Router.gs, 0_config.gs）

【目的】
- タイマー／ヒント処理を完全に削除し、名前当てクイズ専用ロジックに縮約したい。
- 10問固定で配列から問題を供給。各問題は { imageUrl, choices:[], answer } の形。
- 画像URLは GitHub Raw ( https://raw.githubusercontent.com/xxx/repo/main/images/?? ) を参照。
- 結果保存やランキング処理は不要。結果エンドポイントも削除。

【実装要件】
1. QuizLogic.js
   - タイマー関連の変数・関数・イベントを削除
   - ヒント関連の処理も削除
   - `getQuizQuestions()` で10問配列を返し、ランダム化は任意
2. QuizAPI.js
   - `getQuizQuestions()` のみ残す。戻り値は JSON 配列
   - `submitQuizAnswers` や履歴保存は除去（または stub に置換）
3. Router.gs
   - `doGet` は page=index のみ
   - `doPost` は不要になれば削除
4. 0_config.gs
   - 不要シート（USERS, RANKINGS など）はコメントアウト

差分コード、またはファイル全体を提示してください。`

### C. ゲーム画面UIサイバーパンク化（ChatGPT）

`あなたはフロントエンドエンジニアです。既存の `<section id="quizSection">` と `<section id="resultSection">` をサイバーパンク風にリデザインしつつ、構造は維持したいです。以下を踏まえてHTML/CSS/JSコードを提示してください。

【要件】
1. 背景はダークトーン＋ネオングラデーション（例：#0d0d1a → #1f1f3a）にし、body へ `.cyber-bg` などクラスを付与
2. フォントはSF系（Orbitron等がなければ CSS で似せる）で、テキストに発光効果（text-shadow）を追加
3. 問題表示部分は中央カード形式。画像の周りにネオン風の枠（box-shadow, border）を付ける
4. 選択肢ボタン `.choice-button` はネオンカラー（例：#00f0ff）で、hover時に色相が変わる
5. タイマー／ヒントに関するDOMやJSは完全に削除すること
6. 結果画面は正答率のみ表示し、正答率テキストを大型のグロー効果付きフォントで表示。トップへ戻るボタンもネオン風に
7. セクション切り替え用のクラス・ID（homeSection, quizSection, resultSection, startButton, resultText など）は変更しない
8. CSSは `<style>` に追記する形で構いません

【出力】
- `quizSection` と `resultSection` のHTML（必要であれば homeSection も含めて整合性確認用に提示）
- 上記に対応するCSS
- JS側でタイマー/ヒントを削除し、正答率だけ計算するロジックの差分があれば `<script>` 内コードも提示`

### D. テストチェックリスト & データ更新手順（Claude）

`【目的】
- 名前当てクイズのみのアプリに対するテストチェックリストと、問題データ更新手順をまとめたい。
- PC（Chrome）とスマホ（iOS/Android）での操作手順を明記したい。

【出力】
1. テストチェックリスト (Markdown)
   - 前提環境（PC/スマホ）
   - テスト手順：トップ→プレイ→10問回答→結果→トップ復帰
   - 想定される確認項目（画像表示、選択肢反応、正答率表示など）
   - NG例やリカバリ手順があれば記載
2. データ更新手順メモ
   - 問題データ（例：QUESTIONSシートまたは questions.json）の追加方法
   - 画像URL差し替え方法
   - Apps Script への反映手順（clasp push → デプロイなど）

Markdown形式で出力してください。`

### E. 納品パッケージ & README（ChatGPT / Claude）

`生成したソースコードを新規GitHubリポジトリに配置する予定。以下の内容を README.md にまとめてください。

- プロジェクト概要（カラコン名前当てクイズ、30万円スコープ）
- セットアップ手順
  - GitHubからクローン
  - Apps Script側への導入手順（clasp push → 新規デプロイ）
  - ローカルでのHTML動作確認
- データ更新手順（QUESTIONSシート or JSON）
- テスト方法（テストチェックリストへのリンク）
- 今後拡張する場合のガイドライン（ダッシュボード・ランキングなどは未実装）
- ライセンス/注意事項

READMEは Markdownで作成してください。`

## 3. GitHub リポジトリ運用方針

- **新規リポジトリ作成**
    - リポジトリ名例：`hl001-quiz-lite`
    - 初期ブランチ：`main`
    - `.gitignore` に `.clasp.json`, `node_modules`, `.sdd/` など不要ファイルを追加
- **構成案**
    
    `hl001-quiz-lite/
    ├─ README.md
    ├─ src/
    │    ├─ index.html         … トップ＆ゲーム画面
    │    ├─ assets/
    │    │    ├─ logo.png
    │    │    └─ btn_play.png
    │    └─ styles/
    │         └─ main.css         … サイバーパンクデザイン
    ├─ gas/
    │    ├─ 0_config.gs
    │    ├─ QuizLogic.js
    │    ├─ QuizAPI.js
    │    └─ Router.gs
    ├─ docs/
    │    ├─ TEST_CHECKLIST.md    … Claude出力
    │    └─ DATA_UPDATE.md       … Claude出力
    └─ questions/
         └─ questions.json       … 10問のデータ`
    
- **コマンドフロー（例）**Bash
    
    # 
    
    `# 初期化
    git init
    git remote add origin https://github.com/your-account/hl001-quiz-lite.git
    git checkout -b main
    
    # ファイル配置後
    git add .
    git commit -m "Initial commit: quiz-only version"
    git push -u origin main`
    
- **Apps Script との連携**
    - `gas/`配下を `clasp` で push できるよう、 `clasp.json` はローカルに置く（リポジトリには含めない）
    - デプロイ手順は README に記載
- **納品**
    - GitHub リポジトリのリリース機能 or zip ダウンロードを利用してクライアントに渡す
    - `docs`フォルダにはテストログ・手順書を追加

---

# ローカルフォルダ構成（HL002_prequiz）

`C:\Users\seran\Documents\OneDrive\デスクトップ\001Devlopment\HL002_prequiz` を簡易版クイズのルートとして整理する計画。

## 1. フォルダ構成（新規作成）

`HL002_prequiz/
├─ src/             … index.html と CSS、ブラウザ側資材
│    ├─ index.html
│    ├─ styles/
│    │    └─ main.css
│    └─ scripts/ (※追加)
│         └─ main.js
├─ assets/          … ロゴ画像・ボタン画像など
│    ├─ logo.png
│    └─ btn_play.png
├─ gas/             … Apps Script ファイル
│    ├─ 0_config.gs
│    ├─ QuizLogic.js
│    ├─ QuizAPI.js
│    └─ Router.gs
├─ questions/       … 問題データ(JSON 予定)
│    └─ questions.json
├─ docs/            … 手順書・テストログ
│    ├─ README.md
│    ├─ TEST_CHECKLIST.md
│    └─ DATA_UPDATE.md
└─ scripts/ (任意)   … clasp 用設定や補助スクリプト`

*(※元テキストの構成案をベースに、後のテキストで言及された `scripts/main.js` も反映)*

## 2. 既存ドキュメントの配置

- `.sdd/HL001_quiz_only_plan.md` 等のドキュメントは `.sdd/` に残しつつ、納品用には `docs/README.md` へ要約を転記。
- `docs/TEST_CHECKLIST.md` と `docs/DATA_UPDATE.md` は AI (Claude) で生成予定の内容を格納。

## 3. 作業手順（自分）

- 上記フォルダを作成し、必要素材（ロゴ・ボタン画像・問題JSON）を配置。
- 各AIから受け取ったファイルを対応フォルダへ保存：
    - トップ画面HTML/CSS → `src/index.html` / `src/styles/main.css`
    - サイバーパンク対応HTML/CSS/JS → 同じく `src/` 配下に統合
    - Apps Scriptコード → `gas/` 配下
    - テストリスト／データ更新手順 → `docs/`
- GitHubリポジトリにコミット・プッシュ予定の場合は、このディレクトリをリポジトリルートとして利用。

## 4. 今後の確認

- 各AIへのプロンプトは `.sdd/HL001_quiz_only_operation.md` に準備済み。成果物を `HL002_prequiz` 直下に集約する流れに変更。
- 画像参照の相対パスは `/assets/` を想定。Apps Script から参照する GitHub Raw URL もこの構成に合わせて管理。

## 5. 最終状態（HL002_prequiz）

- `src/`: `index.html`、`styles/main.css`、`scripts/main.js`（プレースホルダー）を配置。ここにトップ画面とゲーム画面のHTML/CSS/JSを統合できます。
- `assets/`: ロゴ・ボタンなど静的素材を配置できる空ディレクトリを用意。
- `gas/`: Apps Script 側の `0_config.gs` / `QuizLogic.js` / `QuizAPI.js` / `Router.gs` をダミー配置（Codex出力を差し込む前提）。
- `questions/questions.json`: 問題データのテンプレートを作成。
- `docs/`: `README`、テストチェックリスト、データ更新手順のドラフトを配置（実装後に更新予定）。