# Git Commit Suggester 🤖

A VS Code extension that automatically generates meaningful git commit messages using **Google Gemini AI** — free alternative to GitHub Copilot.

---

## ✨ Features

- 🧠 AI-powered commit messages using Google Gemini 2.5 Flash Lite
- 📋 Follows **Conventional Commits** format (`feat`, `fix`, `docs`, `refactor`, `chore`)
- ⚡ One command — runs instantly from Command Palette
- 📌 Auto-fills the **Source Control commit message box**
- 📎 Copies message to clipboard automatically
- 🆓 100% free using Gemini API free tier

---

## 🚀 How It Works

```
git add .                          # Stage your files
Ctrl+Shift+P                       # Open Command Palette
→ "Suggest Commit Message"         # Run the command
→ AI reads your staged diff        # Analyzes changes
→ Generates commit message         # e.g. "feat(auth): add JWT token refresh logic"
→ Auto-fills commit box ✅         # Ready to commit!
```

---

## 📦 Installation

### From VSIX (local install)
```bash
code --install-extension git-commit-suggester-0.0.1.vsix
```

### From Source
```bash
git clone https://github.com/yourusername/git-commit-suggester
cd git-commit-suggester
npm install
```

---

## ⚙️ Setup

1. Get a free Gemini API key from **https://aistudio.google.com/app/apikey**
2. Open `src/extension.js`
3. Replace `YOUR_GEMINI_API_KEY` with your key:

```js
const YOUR_GEMINI_API_KEY = 'your-key-here';
```

---

## 🛠️ Usage

1. Make changes to your code
2. Stage files:
   ```bash
   git add .
   ```
3. Open Command Palette: `Ctrl+Shift+P`
4. Type: **"Suggest Commit Message"**
5. Message appears in the commit box and is copied to clipboard ✅

---

## 💡 Example Output

| Changes Made | Generated Message |
|---|---|
| Added login validation | `feat(auth): add input validation on login form` |
| Fixed a bug in API | `fix(api): resolve null response on failed requests` |
| Updated README | `docs: update installation and setup instructions` |
| Refactored database queries | `refactor(db): optimize MongoDB aggregation pipeline` |

---

## 🔧 Tech Stack

- **VS Code Extension API** — SCM input box, commands, notifications
- **Google Gemini 2.5 Flash Lite** — AI model for commit message generation
- **Node.js** — Runtime
- **@google/generative-ai** — Gemini SDK

---

## 📁 Project Structure

```
git-commit-suggester/
├── src/
│   └── extension.js      # Main extension logic
├── .vscode/
│   └── launch.json       # Debug configuration
├── package.json           # Extension manifest
└── README.md
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Commit using this extension 😄
4. Push and open a Pull Request

---

---

## 🙋 FAQ

**Q: Why not use GitHub Copilot?**  
A: Copilot costs $10/month. This extension uses Gemini's free tier — 20 requests/day at no cost.

**Q: What if I have no staged files?**  
A: Extension shows a warning: *"No staged files! Run git add first."*

**Q: Does it work with all git repos?**  
A: Yes — any folder with a `.git` directory works.