#!/usr/bin/env node
/*
 * GAS デプロイ自動化スクリプト
 * 手順: clasp push → clasp version → clasp deployments → clasp deploy (固定ID)
 * 使い方:
 *   npm run deploy:gas -- --desc "変更の要約"
 * desc省略時はデフォルトメッセージを使用します。
 */

const { execSync } = require('child_process');
const path = require('path');

// 固定デプロイID（ユーザー指定: 既存IDを再利用）
const FIXED_DEPLOYMENT_ID = 'AKfycbw_pqYq6-ckNmiN9cGa6-XFg_3ZURAOZ0EfghWIu_ukFHCH7TpQXqKOfbOyzWZMnmuB8A';

// .clasp.json はリポジトリ直下にあり、rootDir で HL001-quiz を指しています。
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

function ensureClaspLogin() {
  try {
    const out = run('clasp status');
    if (/No credentials found/i.test(out)) {
      throw new Error('No credentials found');
    }
  } catch (e) {
    console.error('\n[エラー] clasp の認証が必要です。');
    console.error('  対応: cd HL001-quiz && clasp login --no-localhost');
    process.exit(1);
  }
}

function main() {
  const { desc } = parseArgs();

  // 事前チェック
  ensureClaspLogin();

  // 1) push
  run('clasp push');

  // 2) version
  const versionOut = run(`clasp version "${desc}"`);
  const m = versionOut.match(/Created\s+version\s+(\d+)/i) || versionOut.match(/Version\s+(\d+)\s+created/i);
  if (!m) {
    console.warn('[警告] バージョン番号の自動取得に失敗しました。最新バージョンとしてデプロイを試行します。');
  }
  const versionNumber = m ? m[1] : undefined;

  // 3) deployments（確認のみ。存在しない場合は警告）
  try {
    const deps = run('clasp deployments');
    if (!deps.includes(FIXED_DEPLOYMENT_ID)) {
      console.warn('[警告] 指定の固定デプロイIDが既存一覧に見つかりません。既存IDか確認してください。');
    }
  } catch (e) {
    console.warn('[警告] デプロイID一覧の取得に失敗しましたが、デプロイは継続します。');
  }

  // 4) deploy（固定IDの再利用）
  const descWithVersion = versionNumber ? `${desc} v${versionNumber}` : `${desc}`;
  run(`clasp deploy -i ${FIXED_DEPLOYMENT_ID} -d "${descWithVersion}"`);

  console.log('\n[完了] GAS へのデプロイが完了しました。');
  if (versionNumber) {
    console.log(`作成されたバージョン番号: ${versionNumber}`);
  }
}

main();

