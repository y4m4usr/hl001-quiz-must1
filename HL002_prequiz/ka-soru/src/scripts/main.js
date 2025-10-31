"use strict";

// セクション切替
function showSection(id){
  document.querySelectorAll('.page').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id); if(el) el.classList.add('active');
}

// 状態
const Game = {
  questions: [],
  index: 0,
  correct: 0,
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startButton');
  const backBtn  = document.getElementById('backHomeButton');
  if (startBtn) startBtn.addEventListener('click', startGame);
  if (backBtn)  backBtn.addEventListener('click', resetToHome);
});

async function startGame(){
  Game.index = 0; Game.correct = 0; Game.questions = [];
  showSection('quizSection');
  setNotice('問題を読み込み中...');
  try{
    const list = await fetchQuestions();
    Game.questions = (list || []).slice(0,10);
    if (Game.questions.length === 0) throw new Error('問題がありません');
    renderQuestion();
  }catch(e){
    console.error(e);
    setNotice('問題の読み込みに失敗しました');
  }
}

function resetToHome(){
  Game.index = 0; Game.correct = 0; Game.questions = [];
  showSection('homeSection');
}

async function fetchQuestions(){
  // ローカルの questions.json を取得
  const res = await fetch('../questions/questions.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('questions.json fetch failed');
  const data = await res.json();
  // { imageUrl, choices:[string], answer:string }[] を期待
  // シャッフルしてから先頭10件
  return shuffleArray(data).map(q => ({
    imageUrl: q.imageUrl || '',
    choices: Array.isArray(q.choices) ? q.choices.slice(0,4) : [],
    answer: q.answer || ''
  }));
}

function renderQuestion(){
  const q = Game.questions[Game.index];
  if (!q){ return showResult(); }

  setProgress(`Question ${Game.index+1} / ${Game.questions.length}`);
  const img = document.getElementById('quizImage');
  if (img){ img.src = q.imageUrl || ''; img.alt = '問題画像'; }

  const wrap = document.getElementById('choices');
  if (wrap){
    wrap.innerHTML = '';
    const options = shuffleArray(q.choices.slice());
    options.forEach(text => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = text;
      btn.onclick = () => onChoose(text, q.answer, btn, wrap);
      wrap.appendChild(btn);
    });
  }
  setNotice('');
}

function onChoose(selected, answer, btn, wrap){
  const buttons = wrap ? Array.from(wrap.querySelectorAll('.choice-btn')) : [];
  buttons.forEach(b => b.disabled = true);
  if (selected === answer){
    Game.correct += 1;
    if (btn) btn.classList.add('correct');
    setNotice('正解！');
  } else {
    if (btn) btn.classList.add('incorrect');
    // 正解ボタンを強調
    const correctBtn = buttons.find(b => b.textContent === answer);
    if (correctBtn) correctBtn.classList.add('correct');
    setNotice('不正解');
  }
  // 次の問題へ自動遷移
  setTimeout(() => {
    Game.index += 1;
    if (Game.index < Game.questions.length) renderQuestion();
    else showResult();
  }, 900);
}

function showResult(){
  const total = Game.questions.length || 10;
  const accuracy = Math.round((Game.correct / total) * 100);
  const el = document.getElementById('resultText');
  if (el) el.textContent = `あなたの正解率 ${accuracy}%`;
  showSection('resultSection');
}

// UI helpers
function setProgress(text){ const el = document.getElementById('progressText'); if (el) el.textContent = text; }
function setNotice(text){ const el = document.getElementById('quizNotice'); if (el) el.textContent = text; }

function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}

// TODO: サイバーパンクUIとクイズロジックを実装
