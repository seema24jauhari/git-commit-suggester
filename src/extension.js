const vscode = require('vscode');
const { execSync } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

async function suggestCommitMessage() {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found!');
      return;
    }

    // Get staged diff using git extension repo path directly
    const gitExtension = vscode.extensions.getExtension('vscode.git').exports;
    const git = gitExtension.getAPI(1);
    const repo = git.repositories[0];

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
        `Generate a concise git commit message following conventional commits format (feat/fix/docs/refactor/chore).
        Rules:
        - Start with type: scope (optional) then description
        - Be specific about what changed and why
        - Max 72 characters
        - No quotes, no explanation
        
        Diff:\n\n${diff}`
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
    suggestCommitMessage
  );
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };