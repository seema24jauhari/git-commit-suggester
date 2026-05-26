const vscode = require('vscode');
const { execSync } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ✅ Add here
async function getRepo(git) {
  if (git.repositories.length === 1) return git.repositories[0];

  const picks = git.repositories.map(r => ({
    label: r.rootUri.fsPath.split('/').pop(),
    description: r.rootUri.fsPath,
    repo: r
  }));

  const selected = await vscode.window.showQuickPick(picks, {
    placeHolder: 'Select repository to generate commit message for'
  });

  return selected?.repo;
}

// On first use, prompt and store the key securely
async function getApiKey(context) {
  let key = await context.secrets.get('geminiApiKey');
  if (!key) {
    key = await vscode.window.showInputBox({
      prompt: 'Enter your Gemini API key',
      password: true, // masks the input
    });
    if (key) await context.secrets.store('geminiApiKey', key);
  }
  return key;
}

// In suggestCommitMessage, fetch key at runtime
async function suggestCommitMessage(context) {  // receive context  
  const GEMINI_API_KEY = await getApiKey(context);
  if (!GEMINI_API_KEY) return;

  console.log('Using Gemini API Key:', GEMINI_API_KEY)
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found!');
      return;
    }

    // Get staged diff using git extension repo path directly
    const gitExtension = vscode.extensions.getExtension('vscode.git').exports;
    const git = gitExtension.getAPI(1);
    const repo = await getRepo(git);
    if (!repo) return;

    if (!repo) {
      vscode.window.showErrorMessage('No git repo found!');
      return;
    }

    const repoPath = repo.rootUri.fsPath;
    console.log('REPO PATH:', repoPath);

    // Add this line to verify git works in that path
    const status = execSync('git status', { cwd: repoPath }).toString();
    console.log('GIT STATUS:', status);

    const diff = execSync('git diff --staged', { cwd: repoPath }).toString();
    if (!diff) {
      vscode.window.showWarningMessage(`No staged files! Run git add first.${repoPath}`);
      return;
    }

    // Show progress
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: '⏳ Generating commit message...' },
      async () => {
        const result = await model.generateContent(
          `You are a git commit message writer. Analyze the diff and write a clear, human-readable commit message.

          Format: <type>(<scope>): <what changed and why in plain English>

          Types: feat, fix, docs, refactor, chore, style, test

          Rules:
          - First line: 50 chars maximum summary of WHAT changed
          - Second line (optional): only if truly needed, ONE short sentence on WHY
          - STRICTLY max 2 lines, no more
          - No bullet points, no paragraphs, no headers, no extra explanation
          - Use simple words, no jargon
          - No periods at the end
          - No quotes
          - NEVER start with "This commit..." 

          Examples of GOOD messages:
          feat(auth): add Google login so users can skip manual signup
          refactor(api): simplify error handling to reduce repeated code

          fix(cart): prevent duplicate items when clicking add button fast
          Added debounce since users were triggering multiple API calls

          Diff:
          ${diff}`        
        );
        const message = result.response.text().trim();

        // Copy to clipboard
        await vscode.env.clipboard.writeText(message);

        // Show with option to fill SCM box
        const action = await vscode.window.showInformationMessage(
          `✅ ${message}`,
          'Fill Commit Box'
        );

        if (action === 'Fill Commit Box') {
          const gitExtension = vscode.extensions.getExtension('vscode.git').exports;
          const git = gitExtension.getAPI(1);
          const repo = git.repositories[0];
          if (repo) repo.inputBox.value = message;
        }
      }
    );

  } catch (err) {
    vscode.window.showErrorMessage(`Error: ${err.message}`);
  }
}

function activate(context) {
  console.log('✅ Extension Activated!');

   const disposable = vscode.commands.registerCommand(
    'gitcommit.suggest',
    () => suggestCommitMessage(context)  // arrow function, not just suggestCommitMessage
  );
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };