// Improved client-side learning app with live preview, theme/motion polish and celebration effects
// Progress saved in localStorage under key 'lwd_progress'.

const DATA_URL = 'data/lessons.json';
const sectionsContainer = document.getElementById('sectionsContainer');
const contentEl = document.getElementById('content');
const lessonEl = document.getElementById('lesson');
const quizEl = document.getElementById('quiz');
const quizContainer = document.getElementById('quizContainer');
const resultEl = document.getElementById('result');
const welcome = document.getElementById('welcome');
const searchInput = document.getElementById('searchInput');
const resetBtn = document.getElementById('reset-progress');
const previewFrame = document.getElementById('previewFrame');
const runPreviewBtn = document.getElementById('runPreview');
const clearPreviewBtn = document.getElementById('clearPreview');
const startFirst = document.getElementById('startFirst');
const typingEl = document.getElementById('typing');

let data = null;
let progress = loadProgress(); // { "<topicId>": {score: n, completed: true} }
let current = { sectionIndex: null, topicIndex: null };

fetch(DATA_URL)
  .then(r => r.json())
  .then(json => {
    data = json;
    renderSections(data.sections);
    // start typing and animate cards after initial render
    startTyping([
      'Build — Break — Learn. Code your way forward 🚀',
      'Ship small projects. Learn fast.',
      'Practice with quick quizzes and live preview.'
    ], typingEl, 40, 900);
    animateVisibleCards();
  })
  .catch(err => {
    console.error('Failed to load demo data', err);
    contentEl.innerHTML = '<div class="card">Failed to load demo data. Try running a local HTTP server.</div>';
  });

function renderSections(sections){
  sectionsContainer.innerHTML = '';
  const totalTopics = sections.reduce((acc,s)=>acc + (s.topics? s.topics.length:0),0);
  const completed = Object.values(progress).filter(p => p && p.completed).length;
  const overallPerc = totalTopics ? Math.round((completed/totalTopics)*100) : 0;

  // overall progress banner
  const overall = document.createElement('div');
  overall.className = 'card';
  overall.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>Overall Progress</strong><div style="color:var(--muted);font-size:13px">${completed} / ${totalTopics} topics completed</div></div><div style="min-width:120px"><div class="progress-bar"><i style="width:${overallPerc}%"></i></div><div style="text-align:right;color:var(--muted);font-size:12px;margin-top:6px">${overallPerc}%</div></div></div>`;
  sectionsContainer.appendChild(overall);

  sections.forEach((section, sIndex) => {
    const secWrap = document.createElement('div');
    secWrap.className = 'section';
    const title = document.createElement('div');
    title.className = 'section-title';
    title.innerHTML = `<span>${section.title}</span><small style="color:var(--muted)">${section.description || ''}</small>`;
    secWrap.appendChild(title);

    const topicsDiv = document.createElement('div');
    topicsDiv.className = 'topics';
    section.topics.forEach((topic, tIndex) => {
      const topicEl = document.createElement('div');
      topicEl.className = 'topic';
      const tid = `${section.id}__${topic.id}`;
      const statusObj = progress[tid];
      const statusHTML = statusObj && statusObj.completed ? `<span class="status">✓ ${statusObj.score}%</span>` : `<span class="status">•</span>`;
      topicEl.innerHTML = `<div><strong>${topic.title}</strong><div style="color:var(--muted);font-size:12px;margin-top:4px">${truncate(stripTags(topic.content),80)}</div></div><div style="text-align:right"><div>${statusHTML}</div><div class="progress-bar" style="width:110px"><i style="width:${statusObj?statusObj.score:0}%"></i></div></div>`;
      topicEl.onclick = () => openTopic(sIndex, tIndex);
      topicsDiv.appendChild(topicEl);
    });

    secWrap.appendChild(topicsDiv);
    sectionsContainer.appendChild(secWrap);
  });

  // animate cards in with a small stagger
  requestAnimationFrame(() => {
    const cards = sectionsContainer.querySelectorAll('.card');
    cards.forEach((c, i) => setTimeout(() => c.classList.add('animate-in'), i * 80));
  });
}

// Open topic: show content and show quiz button
function openTopic(sectionIndex, topicIndex){
  current.sectionIndex = sectionIndex;
  current.topicIndex = topicIndex;
  const section = data.sections[sectionIndex];
  const topic = section.topics[topicIndex];
  welcome.classList.add('hidden');
  quizEl.classList.add('hidden');
  resultEl.classList.add('hidden');
  lessonEl.classList.remove('hidden');

  lessonEl.innerHTML = `
    <div class="lesson-title">
      <h2>${section.title} — ${topic.title}</h2>
      <div><small class="muted">${section.id} / ${topic.id}</small></div>
    </div>
    <div class="lesson-body">${topic.content}</div>
    <div class="actions">
      <button class="btn" id="startQuiz">Take Quiz</button>
      <button class="btn secondary" id="runInPreview">Run in Preview</button>
      <button class="btn secondary" id="backToHome">Back</button>
    </div>
  `;

  document.getElementById('startQuiz').onclick = () => startQuiz(sectionIndex, topicIndex);
  document.getElementById('backToHome').onclick = () => resetView();
  document.getElementById('runInPreview').onclick = () => runPreviewFor(topic);
  // animate lesson card in
  setTimeout(() => lessonEl.classList.add('animate-in'), 30);
}

function resetView(){
  lessonEl.classList.add('hidden');
  quizEl.classList.add('hidden');
  resultEl.classList.add('hidden');
  welcome.classList.remove('hidden');
}

// Start quiz for a topic
function startQuiz(sectionIndex, topicIndex){
  const topic = data.sections[sectionIndex].topics[topicIndex];
  quizContainer.innerHTML = '';
  quizEl.classList.remove('hidden');
  resultEl.classList.add('hidden');

  const qform = document.createElement('form');
  qform.id = 'quizForm';

  topic.quiz.forEach((q, qi) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'quiz-question';
    qDiv.innerHTML = `<strong>Q${qi+1}.</strong> ${q.question}`;
    q.choices.forEach((choice, ci) => {
      const choiceId = `q${qi}_c${ci}`;
      const label = document.createElement('label');
      label.className = 'choice';
      label.innerHTML = `<input type="radio" name="q${qi}" value="${ci}" id="${choiceId}" /> ${choice}`;
      qDiv.appendChild(label);
    });
    qform.appendChild(qDiv);
  });

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn';
  submitBtn.textContent = 'Submit Quiz';
  qform.appendChild(submitBtn);

  qform.onsubmit = (e) => {
    e.preventDefault();
    evaluateQuiz(topic, qform, `${data.sections[sectionIndex].id}__${topic.id}`);
  };

  quizContainer.appendChild(qform);
  // scroll into view
  quizEl.scrollIntoView({behavior:'smooth'});
}

function evaluateQuiz(topic, formEl, topicKey){
  const answers = [];
  let correctCount = 0;
  topic.quiz.forEach((q, qi) => {
    const val = formEl[`q${qi}`] && formEl[`q${qi}`].value;
    const userIndex = val !== undefined ? parseInt(val, 10) : null;
    answers.push(userIndex);
    if (userIndex === q.answerIndex) correctCount++;
  });
  const total = topic.quiz.length;
  const score = Math.round((correctCount / total) * 100);
  // Save progress
  progress[topicKey] = { completed: true, score };
  saveProgress();

  // Show result and explanations
  showResult(topic, answers, score);
  renderSections(data.sections); // update sidebar status
}

function showResult(topic, answers, score){
  quizEl.classList.add('hidden');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `<h3>Result: ${score}%</h3>`;

  topic.quiz.forEach((q, qi) => {
    const user = answers[qi];
    const ok = user === q.answerIndex;
    const ex = document.createElement('div');
    ex.className = 'card';
    ex.style.marginTop = '8px';
    ex.innerHTML = `<div><strong>Q${qi+1}.</strong> ${q.question}</div>
      <div style="margin-top:8px">Your answer: <strong>${user === null ? 'No answer' : q.choices[user]}</strong> ${ok ? '<span class="result-correct">✔</span>' : '<span class="result-wrong">✖</span>'}</div>
      <div style="margin-top:6px;color:var(--muted)"><em>Explanation:</em> ${q.explanation || '—'}</div>`;
    resultEl.appendChild(ex);
  });

  // celebration for good scores
  if (score >= 80) {
    launchConfetti();
    const badge = document.createElement('div');
    badge.className = 'card';
    badge.style.marginTop = '10px';
    badge.innerHTML = `<strong>Badge Earned 🎉</strong><div style="color:var(--muted);margin-top:8px">Great job! You scored ${score}%.</div>`;
    resultEl.insertBefore(badge, resultEl.firstChild);
  }

  resultEl.scrollIntoView({behavior:'smooth'});
}

function runPreviewFor(topic){
  // inject lesson content into iframe srcdoc
  previewFrame.srcdoc = `<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>body{font-family:Inter,system-ui,Arial;padding:12px}</style></head><body>${topic.content}</body></html>`;
}

runPreviewBtn.onclick = () => {
  if (current.sectionIndex === null) return;
  const topic = data.sections[current.sectionIndex].topics[current.topicIndex];
  if (topic) runPreviewFor(topic);
};
clearPreviewBtn.onclick = () => {
  previewFrame.srcdoc = '';
};
startFirst && (startFirst.onclick = () => {
  // find HTML basics
  const s = data.sections.findIndex(ss => ss.id === 'html');
  if (s >= 0) return openTopic(s, 0);
});

function loadProgress(){
  try {
    const raw = localStorage.getItem('lwd_progress');
    return raw ? JSON.parse(raw) : {};
  } catch(e){
    return {};
  }
}
function saveProgress(){
  try {
    localStorage.setItem('lwd_progress', JSON.stringify(progress));
  } catch(e){ console.warn('Failed to save progress', e) }
}

resetBtn.onclick = () => {
  if (!confirm('Reset all progress?')) return;
  progress = {};
  saveProgress();
  renderSections(data.sections);
  resetView();
};

// Search filter
searchInput.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!data) return;
  if (q === '') {
    renderSections(data.sections);
    return;
  }
  const filtered = data.sections.map(sec => {
    const matchedTopics = sec.topics.filter(t => (t.title + ' ' + (t.content||'')).toLowerCase().includes(q));
    return {...sec, topics: matchedTopics};
  }).filter(s => s.topics.length > 0);
  renderSections(filtered);
});

// small helpers
function stripTags(html){ return html.replace(/<[^>]+>/g, ''); }
function truncate(str, n){ return str.length>n? str.slice(0,n)+'...':str; }

function animateVisibleCards(){
  // ensure all .card inside sectionsContainer animate in with a stagger when visible
  const cards = sectionsContainer.querySelectorAll('.card');
  cards.forEach((c, i) => setTimeout(() => c.classList.add('animate-in'), i*90));
}

// Typing animation (simple)
function startTyping(phrases, el, speed = 50, pause = 800){
  if(!el) return;
  let pIndex = 0; let charIndex = 0; let forward = true;
  el.textContent = '';
  const step = () => {
    const current = phrases[pIndex];
    if(forward){
      if(charIndex < current.length){ el.textContent += current[charIndex++]; setTimeout(step, speed); }
      else { forward = false; setTimeout(step, pause); }
    } else {
      if(charIndex > 0){ charIndex--; el.textContent = current.slice(0,charIndex); setTimeout(step, Math.max(20, speed/2)); }
      else { forward = true; pIndex = (pIndex+1) % phrases.length; setTimeout(step, 200); }
    }
  };
  step();
}

// --- Confetti implementation (simple particles)
const confettiCanvas = document.getElementById('confettiCanvas');
const ctx = confettiCanvas.getContext && confettiCanvas.getContext('2d');
let confettiParticles = [];
function resizeCanvas(){ if(!confettiCanvas) return; confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();

function launchConfetti(){ if(!ctx) return; confettiParticles = [];
  const colors = ['#7c5cff','#00d4ff','#ffe36e','#ff7ab6'];
  const count = 80;
  for(let i=0;i<count;i++){
    confettiParticles.push({
      x: Math.random()*confettiCanvas.width,
      y: -20 - Math.random()*confettiCanvas.height/2,
      vx: (Math.random()-0.5)*4,
      vy: 2+Math.random()*4,
      size: 6+Math.random()*8,
      color: colors[Math.floor(Math.random()*colors.length)],
      rotation: Math.random()*360,
      vr: (Math.random()-0.5)*10
n    });
  }
  animateConfetti();
}
let confettiAnimId = null;
function animateConfetti(){ if(!ctx) return; cancelAnimationFrame(confettiAnimId);
  const step = () => {
    ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    for(let p of confettiParticles){
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.rotation += p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rotation*Math.PI/180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6);
      ctx.restore();
    }
    confettiParticles = confettiParticles.filter(p => p.y < confettiCanvas.height + 50);
    if(confettiParticles.length>0){ confettiAnimId = requestAnimationFrame(step); } else { ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); }
  };
  confettiAnimId = requestAnimationFrame(step);
}
