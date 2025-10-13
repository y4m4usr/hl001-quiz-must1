#!/usr/bin/env node
/*
 * deploy:all
 * 1) git push origin main
 * 2) GAS デプロイ (deploy-gas.js) を実行
 * 使い方:
 *   npm run deploy:all -- --desc "変更の要約"
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  const options = { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', ...opts };
  console.log(`> ${cmd}`);
  try {
    const out = execSync(cmd, options);
    if (out && out.trim()) console.log(out.trim());
    return out || '';
  } catch (err) {
    if (err.stdout) console.error(String(err.stdout));
    if (err.stderr) console.error(String(err.stderr));
    throw err;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const res = { desc: '自動デプロイ' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--desc' && args[i + 1]) {
      res.desc = args[i + 1];
      i++;
    }
  }
  return res;
}

function main() {
  const { desc } = parseArgs();

  // Git 状態チェック（未コミットがあれば注意喚起のみ）
  try {
    const s = run('git status --porcelain');
    if (s && s.trim()) {
      console.warn('[注意] 未コミットの変更があります。最新コミットが push されます。');
    }
  } catch (e) {
    console.warn('[警告] Git 状態の取得に失敗しました。処理は継続します。');
  }

  // 1) push
  try {
    run('git push origin main');
  } catch (e) {
    console.error('\n[エラー] git push に失敗しました。認証設定/ネットワークをご確認ください。');
    console.error('  例: GitHub に PAT を設定するか、通常の認証でログイン');
    process.exit(1);
  }

  // 2) GAS デプロイ
  try {
    const escaped = desc.replace(/"/g, '\\"');
    run(`node scripts/deploy-gas.js --desc "${escaped}"`);
  } catch (e) {
    console.error('\n[エラー] GAS デプロイに失敗しました。clasp の認証状態や固定デプロイIDをご確認ください。');
    process.exit(1);
  }

  console.log('\n[完了] deploy:all が完了しました。');
}

main();

