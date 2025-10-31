# DATA_UPDATE（問題データ更新手順）

## 目的
`src/questions/questions.json` を安全かつ一貫して更新するための手順をまとめます。

## 必要ファイル
- `src/questions/questions.json`
- 参考資料：`docs/README.md`、`AGENTS.md`

## 更新手順
1. 各問題は `{ "imageUrl": string, "choices": string[4], "answer": string }` の形式を守る
2. 最低 10 件の問題を維持し、正解が必ず `choices` に含まれているか確認
3. 画像 URL はブラウザで直接アクセスできる永続リンクを使用する
4. 編集後は `node -e "JSON.parse(require('fs').readFileSync('src/questions/questions.json','utf8'))"` で構文チェック
5. ローカルサーバーを再読み込みし、10 問通しで動作を確認

## 注意事項
- 背景やボタンなどの UI 素材は `src/assets/` に配置し、HTML/CSS/JS から相対パスで参照
- 選択肢は読みやすい字数（10〜16 文字程度）を目安にし、全角・半角の統一感を保つ
- Pull Request では変更理由と検証内容、テストチェックリストの結果を記載する
