# Clineワークフローガイドライン

このファイルは、Clineが「ほぼ全自動」で効率的にタスクを実行するためのガイドラインです。

## 基本原則

### 1. タスク分解（5-15分粒度）
- 大きなタスクは必ず5-15分で完了できる小タスクに分解
- 各小タスクは独立してテスト可能
- チェックリスト形式でタスク進捗を管理

### 2. 実行サイクル
```
Goal定義 → 設計 → 実装 → 実行 → テスト → レビュー → コミット
```

### 3. 安全運用（常時ON）
- ✅ 変更は必ずDiffで可視化
- ✅ 実行コマンドは都度承認を求める（requires_approval適切に設定）
- ✅ API・機密情報は.envで管理
- ✅ 失敗時は自動リトライ前に原因分析

## 具体的ワークフロー

### フェーズ1: Goal定義（5分）
- ユーザーの要求を明確化
- 必要に応じて`ask_followup_question`で詳細確認
- 技術スタック・制約条件を特定
- タスクを小単位（5-15分）に分解してチェックリスト作成

**例:**
```markdown
- [ ] Next.js プロジェクトのセットアップ
- [ ] Supabase接続設定
- [ ] Todoテーブルのスキーマ作成
- [ ] CRUD APIエンドポイント実装
- [ ] UI実装（v0.dev活用）
- [ ] モバイル最適化
- [ ] デプロイ設定
```

### フェーズ2: 設計→実装→実行（10分）
1. **ファイル構造の確認**
   - `list_files`で既存構造を把握
   - `read_file`で関連コードを確認
   - `search_files`でパターン調査

2. **実装**
   - `write_to_file`で新規ファイル作成
   - `replace_in_file`で既存ファイル編集
   - 複数の変更は1ファイルずつ、段階的に

3. **実行とテスト**
   - `execute_command`でビルド・テスト実行
   - エラーがあれば即座に分析・修正
   - 最大3回まで自動リトライ

### フェーズ3: レビューとコミット（5分）
- 変更内容をユーザーに説明
- Diffを明示的に示す
- Git履歴管理を推奨

### フェーズ4: UI生成（必要に応じて10分）
- v0.dev や Bolt.new の利用を提案
- 生成されたコードを統合
- レスポンシブ対応を確認

### フェーズ5: デプロイ準備（5分）
- デプロイ手順をREADME化
- 環境変数の設定ガイド作成
- 次回以降の1コマンド化

## セキュリティチェックリスト

毎回のタスク実行時に確認：

- [ ] APIキー・秘密鍵は.envに配置
- [ ] .gitignoreに機密ファイルを追加
- [ ] 実行コマンドの権限を最小化
- [ ] 外部ライブラリの脆弱性確認
- [ ] ユーザー入力のバリデーション

## エラーハンドリング

### 失敗時の対応
1. エラーメッセージを詳細に分析
2. 原因を特定（構文、ロジック、環境）
3. 修正案を提示
4. 再実行（最大3回）
5. 3回失敗したらユーザーに状況報告

### ロールバック
- Gitコミット履歴で変更追跡
- 失敗時は前の安定状態に戻す提案
- `replace_in_file`で段階的に修正

## ツール選択の優先順位

### ファイル操作
1. `replace_in_file` - 小規模な変更
2. `write_to_file` - 新規作成または大規模書き換え
3. `read_file` - 現状確認

### 情報収集
1. `list_files` - ディレクトリ構造
2. `search_files` - パターン検索
3. `list_code_definition_names` - コード定義一覧

### 実行
1. `execute_command` - CLIコマンド実行
2. `browser_action` - Web確認（必要時）

## コミュニケーション原則

- ❌ 「Great」「Certainly」「Sure」などの冗長な前置きは使わない
- ✅ 技術的で直接的な表現を使う
- ✅ 各ツール使用後、進捗状況を明示
- ✅ 必要な場合のみ`ask_followup_question`を使用
- ✅ タスク完了時は`attempt_completion`で結果を提示

## タスク進捗管理

全てのツール使用時に`task_progress`パラメータを活用：

**例:**
```xml
<execute_command>
<command>npm install</command>
<requires_approval>false</requires_approval>
<task_progress>
- [x] プロジェクト構造の確認
- [x] 依存関係のインストール
- [ ] コンポーネントの実装
- [ ] テスト実行
</task_progress>
</execute_command>
```

## 推奨技術スタック（2025年10月時点）

### フロントエンド
- **Next.js** (React) - App Router推奨
- **Tailwind CSS** - スタイリング
- **shadcn/ui** - UIコンポーネント
- **v0.dev** - UI自動生成

### バックエンド
- **Supabase** - DB + Auth + Storage
- **Next.js API Routes** - サーバーレス

### デプロイ
- **Vercel** - Next.js最適化
- **Netlify** - 代替案

### 開発ツール
- **VS Code** - エディタ
- **Cline** - 自動実装エージェント
- **Continue** + **Ollama** - ローカルLLM
- **aider** - Git連携AI編集

## "ほぼ全自動"の実行例

### シナリオ: Todoアプリ作成（所要時間: 30-45分）

#### ステップ1: Goal定義（5分）
```
ユーザー: "Next.js + Supabase でモバイル向けTodoアプリを作成"

Cline: タスクを分解
- [x] プロジェクトセットアップ
- [ ] Supabase設定
- [ ] データモデル定義
- [ ] CRUD API実装
- [ ] UI実装
- [ ] モバイル最適化
- [ ] デプロイ準備
```

#### ステップ2: 自動実装（10分）
1. `execute_command`: `npx create-next-app@latest todo-app`
2. `execute_command`: `cd todo-app && npm install @supabase/supabase-js`
3. `write_to_file`: `.env.local` にSupabase認証情報
4. `write_to_file`: `lib/supabase.ts` にクライアント設定
5. `write_to_file`: `app/api/todos/route.ts` にCRUD API

#### ステップ3: UI生成（10分）
1. v0.devで「モバイル向けTodo一覧 + 追加フォーム」を生成
2. 生成されたコードを`app/page.tsx`に統合
3. Tailwind設定を調整

#### ステップ4: テストと検証（10分）
1. `execute_command`: `npm run dev`
2. `browser_action`: ローカルサーバーを確認
3. エラーがあれば修正＋再実行

#### ステップ5: デプロイ（5分）
1. GitHubにプッシュ
2. Vercelに接続
3. 環境変数を設定

## 重要な制約事項

### Windows環境での注意
- npm CLIツール `cline` はWindowsで利用不可（macOS/Linux専用）
- VS Code拡張機能の **Cline** は Windows で完全動作 ✅
- パスの区切り文字に注意（`\` vs `/`）

### セキュリティ
- Amazon Q拡張の脆弱性事例を教訓に
- 拡張機能は信頼できるもののみインストール
- 自動更新を有効化
- 定期的にセキュリティ監査

### コスト管理
- クラウドLLM使用時は利用量を監視
- ローカルLLM（Ollama）で無料枠を確保
- 必要に応じてモデルを切り替え

## 次のアクション推奨

今後のタスク実行時、私は以下の方針で動作します：

1. ✅ **タスクを5-15分単位に自動分解**
2. ✅ **進捗をチェックリストで可視化**
3. ✅ **段階的な実装とテスト**
4. ✅ **エラーは最大3回自動リトライ**
5. ✅ **セキュリティチェックを各フェーズで実施**
6. ✅ **完了時は`attempt_completion`で結果提示**

このガイドラインに従い、効率的で安全な開発をサポートします。
