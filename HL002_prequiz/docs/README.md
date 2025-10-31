# HL002_prequiz - プロジェクト概要

HL002_prequiz は、シンプルな 4 択クイズを提供する静的サイトです。HTML/CSS/JavaScript だけで構成されており、出題データや UI 素材を差し替えて運用します。

## ディレクトリ構成
- `src/index.html` / `src/styles/main.css` / `src/scripts/main.js`: アプリ本体
- `src/questions/questions.json`: 出題データ（最低 10 問）
- `src/assets/`: 表示用画像（背景・ロゴ・ボタンなど）
- `image/`: 元デザイン素材の保管場所（参考用）
- `gas/`: Google Apps Script 連携用スタブ
- `docs/`: 運用ドキュメント（README、テスト手順、データ更新手順）
- `.sdd/`: 仕様駆動開発ドキュメント群

## ローカル動作手順
1. `python -m http.server 4173 --directory src` でローカルサーバーを起動
2. `http://localhost:4173/index.html` を開き、ホーム → 10 問解答 → 結果表示まで確認
3. `src/questions/questions.json` を更新したら、`node -e "JSON.parse(require('fs').readFileSync('src/questions/questions.json','utf8'))"` で構文チェック

## データ更新のポイント
- `imageUrl` には永続的に参照できる URL を指定し、404 の場合はアプリ内のフォールバック表示を確認
- `choices` は配列の先頭 4 件が使用されます。正解は必ず `answer` に含める
- 詳細手順は `docs/DATA_UPDATE.md` を参照

## 運用メモ
- Apps Script との連携が必要な場合は `gas/` 以下のスタブを出発点に `clasp` 等で別プロジェクトへ配置
- Pull Request ではテストチェックリストの結果と検証端末を記載し、`AGENTS.md` のガイドラインに従う
