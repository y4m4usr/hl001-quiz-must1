# ホテラバカラコンアカデミア 仕様書 v3.1（差分付き）

作成日: 2025-10-13

この文書は v3.0 仕様書の更新版です。現行アプリ（@108）に合わせて、スコアリング・EXP/RP・ランキング・UI 挙動を反映し、変更点を v3.0 → v3.1 の差分として明示します。

## 1. 変更サマリ（v3.0 → v3.1）
- スコア計算を「正答率(最大100) + ヒント(最大50) + タイム(最大50)」に統一（合計200点満点）
- HISTORY の metadata に実獲得の EXP/RP を保存（expEarned/rpEarned 等）
- EXP/RP の付与ロジック（本番で streak ブースト、練習は控えめ）を実装
- レベルを非線形カーブ（Lv^1.5 * 100 の逐次和）で算出、上限 30
- 称号を TITLES シートで外部管理（例: Lv1 ルーキー、Lv5 エキスパート…）
- ランキングは weekly/monthly/yearly を1枚の rankings シートへ縦連結で出力（daily は出力対象外）
- マイ成績に内訳（正答率/ヒント/タイム/EXP/RP）を表示、直近 EXP/RP の合計と棒グラフを追加
- 結果画面後のループ不具合を修正（finished フラグ、タイマー/タイムアウトの確実停止）
- 重複送信の収束（旧 showResult は新実装へ委譲、window 参照ミスを修正）

## 2. クイズ・スコアリング仕様（v3.1）
- 出題数: 10問、各 4択、各 20秒
- ヒント: 1問につき最大2種
  - ヒント1: カラコン SPEC（DIA / G.DIA / BC）
  - ヒント2: PR コメント
- スコア内訳（最大200点）
  - 正答率: 正解数×10（最大100）
  - ヒントボーナス（正解時のみ加算。合計最大50）
    - ヒント0: +5、ヒント1: +2、ヒント2以上: +0 を全問合計
  - タイムボーナス（正解時のみ加算。合計最大50）
    - 余り秒(20 − timeSpent) を全問合計し、4 で割って丸め（合計余り秒 200 → 50点）
  - 合計: score = accuracy + hintBonus + timeBonus（0..200）

### HISTORY への保存
- 形式: v11（1回答=1行）
- 主な列: A:historyId, B:timestamp, C:userId, D:mode, E:questionId, G:isCorrect, H:hintsUsed, I:timeSpent, J:score(行), K:totalScore(セッション)
- L:metadata(JSON):
  - accuracy, hintBonus, timeBonus, correctCount
  - expEarned, rpEarned（実獲得値）
  - streakAfter（本番の連続日数）、boost（倍率）、levelAfter, pointsAfter

## 3. モードと streak（連続日）
- mode 値: `daily`（本番）/ `practice`（練習）
- 本番は1日1回。USERS.I:lastDailyDate を基準に streak を更新
  - 同日: streak 維持、翌日: streak+1、間隔2日以上: 1 にリセット

## 4. EXP / RP / レベル
- 付与ロジック
  - daily: EXP = totalScore × ブースト, RP = totalScore
    - ブースト: 2日=1.1,3日=1.2,4日=1.3,5日=1.4,6日=1.5,7日以上=1.5
  - practice: EXP = round(accuracy/10)（最大10）, RP = 0
- USERS の反映（awardExperienceAndRank）
  - D:level, E:points(累計EXP), F:streak, H:totalDaily, I:lastDailyDate などを更新
- レベル曲線（上限30）
  - 累積必要 EXP を req[Lv] = req[Lv-1] + round((Lv-1)^1.5 × 100) で生成し判定
- 称号（TITLES シート）
  - [level, title] の表から「そのレベル以下で最大」の称号を採用

## 5. ランキング
- ユーザごとにベストスコアを抽出した on-demand API（getRanking）
- rankings シート生成（updateRankingsAllScopes）
  - weekly / monthly / yearly を scope 列で縦連結
  - daily は出力対象外
- 画面初期タブは weekly（UI 側）

## 6. マイ成績（UI）
- recent10（直近最大10プレイ）を表示
- 1行目: 日付 [本番/練習]
- 2行目: 内訳（正答率/ヒント/タイム/EXP/RP）
- 右側: 合計スコア（点）と正答率
- 上部にサマリーと棒グラフ（EXP/RP の推移）

## 7. 不具合対策・UI改善
- 結果画面後のループ停止
  - `quizState.finished` フラグ、`stopTimer()`、`feedbackTimeoutId` の cancel を徹底
- 重複送信の収束
  - 旧 showResult は新ロジックに委譲
  - `window.currentUser/currentMode` 参照ミスを修正（ローカル変数に統一）
- トースト表示
  - 保存後、最新ユーザー情報と比較してレベルアップ or 獲得量をトースト表示

## 8. 主なサーバ関数（抜粋）
- submitQuizAnswers(payload): 履歴保存（v11）+ EXP/RP 推定保存 + 集計呼び出し
- awardExperienceAndRank(userId, mode, totalScore, accuracy): USERS 更新（レベル/EXP/streak）
- getRanking(scope), updateRankingsAllScopes()
- getMyStats(userId): 直近10プレイ（v11からセッション集計）
- aggregateUserEffort(): USER_EFFORT_STATS 更新
- getHomeData(userId): ホーム表示用（title 付き）

## 9. シート / 設定
- CONFIG.SHEET_IDS によりシート ID 管理。情報シートからの上書き対応あり
- HISTORY シート名は `history / HISTORY / quiz_history / QUIZ_HISTORY` を順に探索
- TITLES（USERS と同ブック）で称号を外部管理

## 10. 既知の課題 / 検討事項（v3.2 候補）
- EXP/RP の履歴を集計する管理 UI（期間合計、日別推移、ユーザー比較）
- ランキングの tie-breaker 明文化と UI 表示
- マイ成績のフィルタ（本番のみ/練習のみ）・期間選択
- グラフを Chart.js 等に置き換え（ツールチップ・軸ラベル）
- 自動テスト（GAS/フロント）の導入

## 11. デプロイ / 運用
- clasp push → version 作成 → 固定デプロイ ID を更新
- Web アプリ URL は固定のまま最新コードへ切替
- 本番は weekly/monthly/yearly のランキングを `updateRankingsAllScopes` で再生成

---

# 付録A: 現在の開発状況まとめ（引き継ぎ用）

- 実装済み
  - スコア: 100(正答率)+50(ヒント)+50(タイム)
  - EXP/RP: 本番=score×ブースト/score、練習=accuracy/10/0
  - streak ブースト: 2日=1.1 … 7日=1.5（上限）
  - レベル: Lv^1.5 カーブ、上限30、称号は TITLES シート
  - HISTORY metadata: accuracy/hintBonus/timeBonus/correctCount/expEarned/rpEarned/streakAfter/boost/levelAfter/pointsAfter
  - ランキング: 週・月・年を1枚に縦連結（dailyは出力対象外）
  - マイ成績: 内訳表示 + 直近 EXP/RP 合計 + 棒グラフ
  - トースト: レベルアップ/獲得量表示
  - バグ修正: 結果画面ループ、送信重複

- 未実装/検討中
  - ランキング画面の日/週/月/年タブの完全整理（daily 非表示 or 切替）
  - EXP/RP 管理 UI（期間比較、ユーザー別）
  - グラフのライブラリ化（Chart.js）
  - 自動テスト/監視

- 運用メモ
  - TITLES が存在しない場合は `ensureDefaultTitlesSheet()` 実行で初期化
  - 仕様変更時は HISTORY の metadata キーを追加して後方互換を維持
  - 週次・月次・年次のランキングは保存時に自動更新（必要に応じ夜間トリガ併用可）

