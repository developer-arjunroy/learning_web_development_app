// Simple client-side learning app. Loads data/lessons.json and renders UI.
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

let data = null;
let progress = loadProgress(); // { "<topicId>": {score: n, completed: true} }

fetch(DATA_URL)
  .then(r => r.json())
  .then(json => {
    data = json;
    renderSections(data.sections);
  })
  .catch(err => {
    console.error('Failed to load demo data', err);
    contentEl.innerHTML = '<div class="card">Failed to load demo data. Are you running via file://? Try a local HTTP server.</div>';
  });

function renderSections(sections){
  sectionsContainer.innerHTML = '';
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
      const status = progress[tid] && progress[tid].completed ? `<span class="status">✓ ${progress[tid].score}%</span>` : `<span class="status">•</span>`;
      topicEl.innerHTML = `<span>${topic.title}</span><span>${status}</span>`;
      topicEl.onclick = () => openTopic(sIndex, tIndex);
      topicsDiv.appendChild(topicEl);
    });

    secWrap.appendChild(topicsDiv);
    sectionsContainer.appendChild(secWrap);
  });
}

// Open topic: show content and show quiz button
function openTopic(sectionIndex, topicIndex){
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
      <button class="btn secondary" id="backToHome">Back</button>
    </div>
  `;

  document.getElementById('startQuiz').onclick = () => startQuiz(sectionIndex, topicIndex);
  document.getElementById('backToHome').onclick = () => resetView();
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

  resultEl.scrollIntoView({behavior:'smooth'});
}

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
