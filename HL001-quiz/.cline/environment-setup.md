# 環境セットアップガイド

## 現在の環境状況

### ✅ インストール済み
- **Node.js**: v22.21.0
- **Git**: 2.51.0.windows.1
- **Python**: 3.14.0
- **Ollama**: 0.11.5（インストール済み、未起動）
- **VS Code**: インストール済み
- **Cline拡張機能**: インストール済み
- **Continue拡張機能**: インストール済み

### ❌ 未インストール
- **aider-chat**: Git連携AI編集ツール

## セットアップ手順

### ステップ1: aiderのインストール（5分）

```bash
# aider-chatをインストール
pip install aider-chat
```

**確認コマンド:**
```bash
aider --version
```

### ステップ2: Ollamaサービスの起動（2分）

Ollamaはインストール済みですが、サービスが起動していません。

**Windowsでの起動方法:**

#### 方法A: GUIから起動
1. スタートメニューで「Ollama」を検索
2. Ollamaアプリをクリックして起動
3. タスクバーにOllamaアイコンが表示されます

#### 方法B: コマンドラインから起動
```bash
# Ollamaサービスを起動
ollama serve
```

**確認コマンド:**
```bash
ollama list
```

### ステップ3: 推奨モデルのダウンロード（15-30分）

#### オプションA: 汎用モデル（推奨）
```bash
# Llama 3.1 8B（軽量で万能）
ollama pull llama3.1:8b
```

#### オプションB: コード特化モデル
```bash
# Qwen2.5 Coder 7B（コード生成に最適）
ollama pull qwen2.5-coder:7b
```

#### 両方インストール（推奨）
```bash
ollama pull llama3.1:8b
ollama pull qwen2.5-coder:7b
```

**モデルサイズ:**
- llama3.1:8b: 約4.7GB
- qwen2.5-coder:7b: 約4.4GB

### ステップ4: Continue拡張機能の設定（5分）

Continueは既にインストール済みですが、Ollamaに接続する必要があります。

#### 設定手順:

1. **VS Codeで Continue を開く**
   - サイドバーのContinueアイコンをクリック
   - または `Ctrl+L` (Windows)

2. **設定を開く**
   - Continueパネルの右上の歯車アイコンをクリック
   - `config.json` が開きます

3. **Ollamaモデルを追加**

既存の設定ファイルを以下のように編集:

```json
{
  "models": [
    {
      "title": "Llama 3.1 8B (Local)",
      "provider": "ollama",
      "model": "llama3.1:8b"
    },
    {
      "title": "Qwen 2.5 Coder 7B (Local)",
      "provider": "ollama",
      "model": "qwen2.5-coder:7b"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Qwen Coder (Autocomplete)",
    "provider": "ollama",
    "model": "qwen2.5-coder:7b"
  }
}
```

4. **設定を保存**
   - `Ctrl+S` で保存
   - Continueが自動的に再読み込みされます

### ステップ5: VS Code拡張機能の確認

以下の拡張機能が推奨されます:

#### 既にインストール済み:
- ✅ **Cline** - 自動実装エージェント
- ✅ **Continue** - ローカルLLM接続

#### 追加推奨（任意）:
- **Prettier** - コードフォーマッター
- **ESLint** - JavaScript/TypeScript リンター
- **Tailwind CSS IntelliSense** - Tailwind補完
- **GitLens** - Git拡張機能

**インストール方法:**
1. VS Codeの拡張機能タブを開く（`Ctrl+Shift+X`）
2. 拡張機能名を検索
3. 「インストール」をクリック

### ステップ6: 動作確認（5分）

#### 1. Ollamaの確認
```bash
# モデル一覧を表示
ollama list

# モデルでチャット（テスト）
ollama run llama3.1:8b "Hello, can you write a simple function?"
```

#### 2. Continueの確認
1. VS CodeでContinueを開く（`Ctrl+L`）
2. "Write a hello world function in JavaScript" と入力
3. Ollamaモデルを選択
4. レスポンスが返ってくることを確認

#### 3. aiderの確認
```bash
# プロジェクトディレクトリで実行
aider --help
```

## トラブルシューティング

### Ollamaが起動しない
**症状:** `could not connect to a running Ollama instance`

**解決策:**
1. Windowsの「サービス」アプリでOllamaサービスを確認
2. タスクマネージャーで`ollama.exe`が実行中か確認
3. Ollamaアプリを再インストール

### Continueがモデルを認識しない
**解決策:**
1. Ollamaが起動していることを確認
2. `ollama list` でモデルがダウンロードされていることを確認
3. VS Codeを再起動
4. Continue拡張機能を再読み込み

### aiderが動作しない
**解決策:**
1. Pythonのバージョン確認: `python --version`
2. pipを更新: `python -m pip install --upgrade pip`
3. aiderを再インストール: `pip install --upgrade aider-chat`

### モデルのダウンロードが遅い
**対処法:**
- 高速なネットワーク環境で実行
- ダウンロード中断時は再度 `ollama pull` を実行（レジューム機能あり）

## セキュリティ設定

### 機密情報の管理

プロジェクトルートに `.env` ファイルを作成:

```bash
# .env ファイル
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_api_key_if_needed
```

`.gitignore` に追加:
```
.env
.env.local
.env.*.local
```

## コスト最適化

### ローカルLLM vs クラウドLLM

#### ローカルLLM（Ollama）- 無料
**使用場面:**
- コード補完
- 簡単な質問
- プロトタイピング
- プライベートなコード作業

**利点:**
- 完全無料
- オフライン動作
- プライバシー保護
- 無制限の使用

**欠点:**
- GPT-4/Claude-3.5より精度が低い
- PCリソースを消費

#### クラウドLLM（Cline経由）- 有料
**使用場面:**
- 複雑なリファクタリング
- アーキテクチャ設計
- 大規模な機能実装
- 高精度が必要な作業

**推奨戦略:**
1. 日常的なコード作業はOllama（無料）
2. 重要な実装はClineのクラウドモデル（有料）
3. 予算に応じて使い分け

## 推奨ワークフロー

### 開発の流れ

1. **プランニング（Plan Mode）**
   - Clineで要件を整理
   - タスクを5-15分単位に分解

2. **実装（Act Mode）**
   - 簡単なコードはContinue + Ollama
   - 複雑な実装はCline（クラウド）
   - Git管理はaiderで自動化

3. **レビュー**
   - 変更をDiffで確認
   - テスト実行
   - コミット

4. **デプロイ**
   - Vercel / Netlifyへプッシュ
   - 環境変数の設定

## 次のステップ

環境セットアップが完了したら:

1. ✅ `.cline/workflow-rules.md` でワークフローを確認
2. ✅ サンプルプロジェクトで動作テスト
3. ✅ 実際のプロジェクトで活用開始

## 参考リンク

- [Ollama公式サイト](https://ollama.com/)
- [Continue公式ドキュメント](https://continue.dev/docs)
- [aider GitHub](https://github.com/paul-gauthier/aider)
- [Cline公式ドキュメント](https://docs.cline.bot/)

---

**最終更新**: 2025/10/30  
**対象環境**: Windows 11, VS Code, Python 3.14, Node.js 22.21
