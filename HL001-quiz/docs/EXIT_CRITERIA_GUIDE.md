# EXIT-CRITERIA 運用ガイド

各成果物の末尾に自己採点ラベル（EXIT-CRITERIA 行）を付け、抜け漏れを機械的にチェックできるようにします。

## 基本ルール

- **出力の末尾に 1 行追加**する  
  例: `EXIT-CRITERIA: spec✅ tests✅ docs⚠️ risks✅ summary✅`
- **記号は固定**  
  - ✅ : 達成済み
  - ⚠️ : 要対応/未解決
  - ⏳ : 保留
  - ❌ : 未着手
- **テンプレは用途により固定順序**（必要に応じてカスタマイズ可）

## 推奨テンプレート

| 用途 | テンプレート (VS Code スニペット `exitcrit*`) |
|------|----------------------------------------------|
| 汎用 | `EXIT-CRITERIA: spec✅ tests✅ docs✅ risks✅ summary✅` |
| コード/PR | `EXIT-CRITERIA: builds✅ lints✅ tests✅ docs⚠️ risks✅ rollout-plan✅` |
| 仕様/設計 | `EXIT-CRITERIA: scope✅ acceptance-criteria✅ diagrams⏳ traceability✅ open-issues⚠️` |
| HL001 データ整合 | `EXIT-CRITERIA: schema✅ E/I/J/K一致✅ 画像リンク✅ manifest連携✅ 欠損=0✅ 除外リスト更新⚠️ docs✅` |

> VS Code では `exitcrit` / `exitcrit-code` / `exitcrit-spec` で呼び出せます。

## ワークフローへの組み込み

1. **VS Code スニペット**  
   `.vscode/exit-criteria.code-snippets` にテンプレを登録済みです。
2. **チェックリスト運用**  
   ⚠️ や ❌ が残っている場合のみ、レビューや追加作業を実施。
3. **CI での自動検出（任意）**  
   `scripts/check_exit_criteria.sh` を CI のステップに組み込み、`⚠️/❌` が残っている差分があれば失敗させることができます。

## 実行例 (CI / ローカル)

```bash
./scripts/check_exit_criteria.sh
```

⚠️ または ❌ が含まれていれば終了コード 1 で終了し、修正を促します。

---

## HL001 向けデータ検証スクリプト

`node tools/check_exit_criteria.js` を実行すると、HL001 用のデータ整合チェック（schema / CK / manifest / 画像リンク など）と EXIT-CRITERIA 行を自動評価します。  
CI では以下のように組み込めます。

```yaml
- name: Validate HL001 exit criteria
  run: node tools/check_exit_criteria.js
```

---

EXIT-CRITERIA: scope✅ acceptance-criteria✅ diagrams✅ traceability✅ open-issues✅
