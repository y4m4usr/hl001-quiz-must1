# リポジトリガイドライン

このリポジトリは HL002 事前クイズの単一ページ体験を提供します。以下の運用指針に従い、変更を集中・可視化・デプロイしやすい形で維持してください。

## プロジェクト構成とモジュール
- `src/index.html` が UI を描画し、`src/scripts/main.js` がクイズ進行、`src/styles/main.css` がレイアウトと状態クラスを管理します。
- `src/questions/questions.json` は実行時の問題バンクです。`main.js` のスライス処理を活かすため、常に 10 件以上を保持します。
- 表示用画像は `src/assets/` に配置します。元素材は `image/` に保存しておき、必要に応じて加工してください。
- Google Apps Script 連携用のスタブは `gas/` に置かれています。Apps Script へデプロイするときのみ編集します。

## ビルド・テスト・開発コマンド
- ローカルプレビュー: `python -m http.server 4173 --directory src`
- JSON 検証: `node -e "JSON.parse(require(''fs'').readFileSync(''src/questions/questions.json'',''utf8''))"`
- 本番配備はリポジトリ構成を静的ホスティングにコピーするだけです。`src/` 以下に最終成果物をまとめてください。

## コーディング規約と命名
- JavaScript はバンドル前提がないため ES6 範囲で記述し、`"use strict";` を保持します。`const`/`let` と camelCase の関数名（例 `renderQuestion`）を使い、既存コードと同じ 2 スペースインデントを守ります。
- CSS は `main.css` に追記し、`.quiz-header` や `.home-start` のようなコンポーネント接頭辞を付けます。関連ルールは短いコメントやまとまりで整理してください。
- JSON オブジェクトは `{ "imageUrl", "choices", "answer" }` のキー順を維持し、レビュー時の差分ノイズを減らします。

## テスト指針
- UX やデータを変更した際は `docs/TEST_CHECKLIST.md` の項目をすべて実施し、開始フロー・10 問ループ・結果画面・戻り動作を確認します。
- 設問更新後はデスクトップ Chrome とモバイル 1 種以上でスモークテストを行い、レスポンシブ挙動と画像フォールバックを確認します。
- 実施した端末／ブラウザを PR 説明欄に記録し、レビュー側で残作業を補完できるようにします。

## コミットとプルリク運用
- Conventional Commits（`feat(ui-login): …`、`chore: …` など）を使用し、件名は命令形で 72 文字以内を目安にします。
- 変更は関連する単位で束ね、データのみの更新は `docs/DATA_UPDATE.md` に触れた専用コミットを作成します。
- PR には概要、関連 Issue、テスト証跡（コマンド実行やチェックリスト結果）、UI 変更多発時の Before/After 画像を添付してください。

## データ・コンテンツ更新
- 問題を更新する際は `src/questions/questions.json` をまとめて編集し、送信前にすべての `imageUrl` をブラウザで直接確認します。
- 編集後は JSON 検証コマンドを実行し、ローカルサーバー経由で `src/index.html` を再読み込みして新データが反映されることを確認します。
