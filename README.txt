STAY A WHILE — STUDENT EDITION
================================

Folder structure
----------------
stay-a-while-student/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── server/
│   └── server.js
├── package.json
├── .env.example
├── .gitignore
└── README.txt

Features
--------
- Gemini AI student companion chat
- Quick chat prompts
- Breathing exercise directly from the chat area
- 1-minute 4–4–6 breathing exercise
- Student dashboard
- Today's task list
- Study goals
- 25/5/15 focus timer
- Study-minute tracking
- Simple study streak
- Exam countdown
- Marks percentage calculator
- Brain dump / notes saved in local browser storage
- Motivation cards
- Light/dark mode
- Crisis support links

Setup
-----
1. Install Node.js LTS.
2. Open this folder in VS Code.
3. Open Terminal in the project root.
4. Run:

   npm install

5. Copy .env.example to a new file named .env.
6. Put your Gemini API key in .env:

   GEMINI_API_KEY=YOUR_REAL_KEY

7. Start:

   npm start

8. Open:

   http://localhost:3000

IMPORTANT
---------
Do not double-click index.html when you want Gemini chat.
Use http://localhost:3000 because the chat needs the local server.

Never put your real API key in index.html or js/script.js.
Never commit .env to GitHub.

The breathing exercise works locally and does not need the Gemini API.
Tasks, goals, notes, exam date, study minutes, and streak use browser localStorage.

If Gemini returns an error, the UI now shows the server's error message.
Do not share your API key in screenshots or chat.
