# リポジトリガイドライン

このリポジトリは HL002_prequiz の単一ページ型クイズを管理します。以下の指針に沿って、変更を整理しやすい状態を維持してください。

## プロジェクト構成とモジュール
- `src/index.html` が UI、`src/scripts/main.js` がロジック、`src/styles/main.css` がスタイルを担当します。
- `src/questions/questions.json` は実行時に読み込む問題データです。構造は `{ "imageUrl", "choices", "answer" }` に統一し、最低 10 問を保持します。
- 表示用画像は `src/assets/` に配置し、元素材は `image/` に保存しておきます。
- Google Apps Script 連携が必要な場合のみ `gas/` 以下のスタブを編集します。

## ビルド・テスト・開発コマンド
- ローカルプレビュー: `python -m http.server 4173 --directory src`
- JSON 検証: `node -e "JSON.parse(require(''fs'').readFileSync(''src/questions/questions.json'',''utf8''))"`
- 本番配備は `src/` 以下を静的ホスティングにコピーするだけで完了します。

## コーディング規約と命名
- JavaScript は ES6 範囲で記述し、`"use strict";` を保持します。`const`/`let` と camelCase を使い、2 スペースインデントで統一します。
- CSS は `main.css` に集約し、機能が分かるクラス名（例: `.home-start`, `.quiz-header`）を付けます。
- JSON は `{ "imageUrl", "choices", "answer" }` のキー順を維持して差分を最小化します。

## テスト指針
- UX やデータを変更したら `docs/TEST_CHECKLIST.md` に沿って開始→10 問解答→結果表示まで確認します。
- PC Chrome とモバイル 1 種以上でスモークテストを行い、レスポンシブ表示と画像フォールバックを確認します。
- テスト端末や気づきを PR 説明に残し、後続が追試できるようにします。

## コミット／PR 運用
- Conventional Commits（`feat: ...`、`fix: ...` など）を推奨し、件名は命令形・72 文字以内を目安にします。
- 変更は関連単位で束ね、データのみの更新は `DATA_UPDATE.md` に触れた専用コミットを作成します。
- PR には概要・関連 Issue・テスト結果・UI 変更時の比較画像を添付してください。

## データ・コンテンツ更新
- `src/questions/questions.json` を編集したら、各 `imageUrl` をブラウザで直接確認します。
- 更新後は JSON 構文チェックとローカルプレビューでの再確認を行ってから共有してください。
