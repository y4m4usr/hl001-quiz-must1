# Project Structure

## ルートディレクトリ構成
```
/
├── src/            # アプリ本体（HTML/CSS/JS）
│   ├── index.html
│   ├── scripts/
│   │   └── main.js
│   └── styles/
│       └── main.css
├── questions/      # クイズ問題データ (questions.json)
├── docs/           # 運用ドキュメントとチェックリスト
├── assets/         # ロゴやボタンなどの静的アセット
├── image/          # 追加画像の保管場所（未使用の場合あり）
├── gas/            # Google Apps Script 用スタブ
├── .sdd/           # 仕様駆動開発ドキュメント
└── AGENTS.md / README.md
```

## コード構成パターン
- `src/index.html` がすべての画面セクション（ホーム・クイズ・結果）を持つ単一ページ構造。
- `src/scripts/main.js` は DOMContentLoaded でイベントを初期化し、問題取得→表示→結果集計までを担当。
- `src/styles/main.css` はコンポーネント単位のクラス（`page`, `choice-btn`, `notice` など）でスタイルを定義。
- `questions/questions.json` は `{ "imageUrl", "choices", "answer" }` の配列で上位 10 件を出題。
- `gas/` 以下は Apps Script 連携時のエンドポイント雛形を格納（現状は TODO スタブ）。

## ファイル命名規則
- HTML/CSS/JS：スネークレスな英小文字＋区切りハイフン（例：`main.css`、`main.js`）
- JSON データ：役割を明確にした単数形ファイル名（`questions.json`）
- 画像・アセット：用途がわかる英小文字＋アンダースコア（例：`logo.png`、`btn_play.png`）

## 主要な設計原則
- **静的ホスティング前提**：ビルドレスで配備できるよう依存を最小化。
- **データ駆動**：UI は `questions.json` の更新で差し替え、ロジック側は配列操作で汎用化。
- **軽量な UX**：セクション切り替えのみで完結し、ページリロードを伴わない。
