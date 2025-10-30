# Figma Export Plugin – HL001（図面とアセットエクスポート指針）

## 1. Overview
- **Purpose**: keep web/AppScript UI in sync with the latest Figma screens by exporting layout JSON + PNG bundles that Codex can consume.
- **Scope**: `docs/figma-plugin/export-codex-layout/*` (manifest ID `1564290291107280052`).
- **Supported editors**: Figma only (`editorType: ["figma"]`).

## 2. Why the plugin is necessary
1. Designers iterate purely in Figma; engineers need pixel-accurate assets without manually slicing.
2. App UI (login/home/quiz) mixes static imagery and dynamic data, so layout metadata (`x/y/width/height`) must travel with each asset.
3. GAS deploy latency requires us to package everything locally (`images/<screen>.ui-assets`) and push via `codex ui-assets sync ./exports/<layout>.zip`.

## 3. 機能サマリ
| 機能 | 内容 |
| --- | --- |
| アセット自動判定エクスポート | 表示状態のノードすべてに一意の `section/area/assetName`（例: `global_<screen>_*`）を割り当て。レイヤー種別や `format=...` 指示に応じて PNG / JPG / WebP を自動選択しつつ、元データは保持するため UI 側で再エンコード可能。 |
| ハッシュ付きメタデータ | 各アセットおよび画面プレビューに SHA-256 ハッシュを付与（`metadata.assetHash`, `assets[].hash`）。差分検知や軽量デプロイに利用できる。 |
| フレームプレビュー出力 | `<layout>.preview.png` とハッシュを同梱し、Figma を開かなくても画面全体を確認できる。 |
| コメント取り込み | レイヤー紐づけコメントを収集し、`metadata.designNote` の `[comments]` ブロックとして追記。集計結果は UI のサマリに表示される。 |
| セマンティック／レスポンシブ情報 | `semanticRole`、Auto Layout や constraints に基づく `responsiveSpec`、プロトタイプ遷移をまとめた `interactionMap`、テキストと背景のコントラスト判定（`metadata.a11y.contrast`）をエクスポートに含める。 |
| CSS テンプレート出力 | 名前/description に `css-template` が含まれる場合は PNG をスキップし、`metadata.cssSnippet`（背景・枠線・影など）と `cssPreview` を出力してコーディング指針を補助。 |
| UI エクスポートコンソール | プラグイン UI でアセット一覧・メタ情報・ハッシュを確認でき、任意で PNG/JPG/WebP へ変換可能。DLボタンのほか、`<layout>.ui-assets.zip` を DEFLATE 圧縮で生成し、CLI 用コマンドもコピーできる。 |

## 4. 利用手順
1. Figma で対象フレーム（例: `screen_login`）を選択し、**Codex Layout Exporter** を実行する。
2. コメント取得を有効にするため、初回にトークン入力を求められたら承認する（詳しくは §7）。
3. プラグイン UI でアセット・ハッシュ・プレビューを確認し、必要に応じて書き出し形式を切り替える（例: 写真は JPG、アイコンは PNG）。
4. `layout.json`／`<layout>.ui-assets.zip` をダウンロードするか、表示される `codex ui-assets sync ./exports/<layout>.zip` コマンドをコピーして CLI で同期する。
5. 生成物を `images/<layout>.ui-assets/` 配下に保存し、関連する HTML / Apps Script の変更と一緒にコミット・デプロイする（clasp手順に準拠）。

## 5. デプロイ手順
1. プラグインのコード/UI を更新 → スキーマ変更があれば `npx spec-driven-codex init` → 必要に応じて `tsc`（または手動ビルド）。
2. `docs/figma-plugin/export-codex-layout` 以下を zip 化し、Figma のマニフェスト ID `1564290291107280052` に再アップロード（もしくは `figplug` CLI を使用）。
3. デザイナーは Figma の「開発版プラグイン」タブから再実行すれば最新が反映される。追加設定は不要。

## 6. メタデータ対応表

| 項目 | 取得元 | 備考 |
| --- | --- | --- |
| `layout.meta.commentSummary` | Figma コメント API | コメント総数と対象レイヤー数を保持。 |
| `objects[].metadata.designNote` | レイヤー description + `[comments]` | コメントがある場合 `[comments]` ブロックに列挙。 |
| `objects[].metadata.semanticRole` | レイヤー名/description 解析 | button / link / nav / dialog などを推定。必要に応じ description で上書き可。 |
| `objects[].metadata.responsiveSpec` | Auto Layout・constraints | レイアウトモード、パディング、折り返し、サイズ指定を出力。 |
| `objects[].metadata.interactionMap` | プロトタイプの reaction | クリック→画面遷移等のトリガー/アクション情報。 |
| `objects[].metadata.a11y.contrast` | テキスト＋推定背景色 | コントラスト比・AA/AAA チェック結果を含む。 |
| `objects[].metadata.cssTemplate` | 名前/description | コード再現が前提の場合 `true`。 |
| `objects[].metadata.cssSnippet` | 塗り・線・効果解析 | 背景色、グラデーション、影、ぼかし等の CSS 雛形。 |
| `objects[].metadata.cssPreviewBase64` | `exportAsync`（縮小） | CSS 再現用プレビュー PNG と `cssPreviewHash`。 |
| `objects[].image.hash` / `metadata.assetHash` | SHA-256 | アセット変更が無い場合のアップロード省略に活用。 |

UI 側で形式変換を行っても、オリジナルのバイナリは保持しているため再現性は確保される。デザイン変更後にハッシュを更新したい場合は、Figma から再エクスポートする。

## 7. コメント取得トークン

プラグインはまず `figma.getLocalCommentIdsAsync()` を試み、利用できない場合（古い Figma バージョン等）は REST API にフォールバックする。

1. プロジェクト管理者に依頼し、短期利用の [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens) を発行してもらう。
2. プラグイン実行時のダイアログでトークンを入力するか、**Plugins → Development → Codex Layout Exporter → Set Comment Token** から事前登録する。
3. トークンは `clientStorage` と `getSharedPluginData("codex","commentToken")` の双方に保存される。不要になったら削除してよい。

トークン未設定の場合はコメント取得をスキップし、サマリは `0 件` のまま動作する。

## 8. 今後の拡張候補
- **スキーマのバージョン管理**: `/docs/figma-plugin/schemas/` に JSON スキーマとサンプルバンドルを公開し、下流ツールから検証可能にする。
- **UI 上でのアクセシビリティ警告**: AA/AAA に満たないレイヤーをプラグイン画面で強調表示する。
- **CLI 連携による差分判定**: `codex ui-assets sync` が SHA-256 ハッシュを参照して未変更アセットを自動スキップできるよう連携を強化する。
