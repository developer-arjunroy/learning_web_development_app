# Learn Web Development — Demo

This is a simple client-side learning site (HTML/CSS/JS) with quizzes per topic and a demo JSON database.

How it works
- The site loads `data/lessons.json` which contains sections, topics, lesson HTML and quizzes.
- Progress (completed topics and scores) is saved to your browser's `localStorage`.
- No server required for basic usage, but serving over HTTP avoids fetch restrictions.

Run locally
1. Start a simple HTTP server from the project folder:
   - Python 3: `python -m http.server 8000`
2. Open `http://localhost:8000` in your browser.

Edit content (demo DB)
- `data/lessons.json` holds the content. Each topic should include:
  - id, title, content (HTML string), quiz (array of questions)
  - question: string, choices: string[], answerIndex: number, explanation: string

Possible next steps
- Add a backend (Node/Express + DB) to persist user accounts and progress.
- Integrate a code editor (Monaco/CodeMirror) and live preview.
- Add timers, badges, or certificate generation.

License
- Demo code — modify and extend as you wish.
