# HL001 自動化タイミングとコマンド実行設計

このメモでは、HL001 のデータ／画像運用に関連する自動スクリプトが **いつ・どのイベントで実行されるか** をまとめます。  
Codex に追加してもらった GitHub Actions と Node/GAS スクリプトの想定タイミングも記録します。

---

## 1. 自動チェック（`check_exit_criteria.js`）

### 実行トリガー
- ✅ Pull Request（対象: main / develop ブランチ）
- ✅ Push（対象: main / develop / feat/** ブランチ）
- ✅ ファイル変更が以下に含まれる場合のみ
  - `data/**`, `manifest/**`, `imagesnew1/**`, `tools/**`
- ✅ スケジュール: 毎日 03:00 JST（UTC 18:00）
- ✅ 手動実行: `workflow_dispatch`

### 役割
- CSV（E/I/J/K）整合性・欠損チェック
- manifest.json との紐付け確認
- 画像リンクの存在確認 ⇒ `exit_report_urls.json` などを生成し、Artifacts に保存

---

## 2. 自動反映（`auto_update_manifest.js`）

### 実行トリガー
- ✅ Push（develop ブランチの対象パス変更時）
- ✅ スケジュール: 毎日 03:30 JST（UTC 18:30）  
  ※ exit_check が 03:00 に走ることを前提に 30分後に設定
- ✅ 手動実行: `workflow_dispatch`

### 事前処理
1. `node tools/check_exit_criteria.js` を再実行し、最新の `exit_report_*` を生成
2. `node tools/auto_update_manifest.js` を **DRY_RUN=1** でプレビュー
3. 問題なければ本番モード（DRY_RUN=0）で
   - manifest.json に欠落分を追記
   - 既存URLを CDN へリベース（REBASE_FROM/TO）
   - git ブランチ作成 → コミット → PR 作成
   - PR本文に差分表（HTTPコード / OK表記付き）を自動挿入
   - `AUTO_PR_COMMENT=1` の場合、PR に差分サマリ＋ diff をコメント投稿

---

## 3. 補助スクリプトの運用例

| コマンド | 推奨タイミング | 役割 |
| --- | --- | --- |
| `node tools/check_exit_criteria.js` | データ更新直後（ローカルで確認したい時） | 手動で不整合をチェック |
| `npm run manifest:dry` | PR 作成前の最終確認 | manifest 自動更新のプレビュー |
| `npm run manifest:update` | 手動で manifest を更新したい時 | PR を自動作成 |
| `npm run rebase:urls` | CDN への切り替えや一括置換が必要な時 | リポジトリ全体の URL を安全に置換（DRY_RUN=1 推奨） |

---

## 4. 推奨ワークフロー（時系列）

| 時刻（JST） | イベント | 実行内容 |
| --- | --- | --- |
| 常時 | PR or Push | `HL001 Exit Criteria Check` が自動実行 |
| 03:00 | スケジュール | 同上（夜間バッチ） |
| 03:30 | スケジュール | `HL001 Manifest Auto Update` が exit_report を再生成 → DRY_RUN → 本番反映（必要な場合だけ PR 作成） |

このフローにより、**データ更新 → チェック → manifest 更新 → PR** という一連の作業を、人的介入を最小限にして回せます。

---

## 5. 注意点
- manifest 自動更新は `gh` CLI を利用するため、GitHub Actions の認証スコープ（contents / pull-requests）が必要です。
- `REBASE_FROM` / `REBASE_TO` を本番値に置き換えるまでは、PR は生成されますが URL 置換は行われません。
- PR が何も更新しなかった場合、`auto_update_manifest.js` は「No manifest changes」として終了します（何もコミットされない）。
- スケジュール実行は UTC 基準です。サマータイムに注意してください。

---

以上が、HL001 における自動化タイミングとコマンド実行のベストプラクティスです。必要に応じて Cron 時刻や対象パスを調整してください。
