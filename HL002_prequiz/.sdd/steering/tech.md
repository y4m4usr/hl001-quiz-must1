# Technology Stack

## アーキテクチャ
静的ホスティング前提のシングルページ構成。ブラウザ上のバニラ JavaScript が JSON データを取得し DOM を更新します。サーバーサイド処理やビルドパイプラインは持たず、必要に応じて Google Apps Script 連携用のスタブを提供します。

## 使用技術
### 言語とフレームワーク
- HTML5：ページレイアウトとアクセシビリティ要素
- CSS3：`src/styles/main.css` によるスタイル定義
- JavaScript (ES6) ：`src/scripts/main.js` によるクイズロジック
- Google Apps Script（将来的な API 連携用スタブ）

### 依存関係
- 外部ライブラリは未使用。標準ブラウザ API と Fetch API で実装。
- Web フォント（Google Fonts: Inter）を HTML から直接読み込み。

## 開発環境
### 必要なツール
- 任意のモダンブラウザ（Chrome 最新版推奨）
- Python 3 もしくは同等の静的サーバー（ローカルプレビュー用途）
- Node.js（JSON 検証など簡易スクリプト実行に使用可能、必須ではない）

### よく使うコマンド
- ローカル起動：`python -m http.server 4173 --directory src`
- JSON 検証：`node -e "JSON.parse(require('fs').readFileSync('questions/questions.json','utf8'))"`
- フォーマット／ビルド工程は存在しないため不要

## 環境変数
本プロジェクトで必須となる環境変数はありません。Apps Script 連携が必要な場合はデプロイ先のスクリプトプロパティで個別に管理します。
