const vscode = require('vscode');
const { execSync } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function getRepo(git) {
  // filter only repos with staged changes
  const reposWithChanges = git.repositories.filter(r => {
    try {
      const diff = execSync('git diff --staged', { cwd: r.rootUri.fsPath }).toString();
      return diff.length > 0;
    } catch {
      return false;
    }
  });

  if (reposWithChanges.length === 0) {
    vscode.window.showWarningMessage('No staged files in any repository! Run git add first.');
    return null;
  }

  if (reposWithChanges.length === 1) return reposWithChanges[0];

  const picks = reposWithChanges.map(r => ({
    label: r.rootUri.fsPath.split(/[\\/]/).pop(),
    description: r.rootUri.fsPath,
    repo: r
  }));

  const selected = await vscode.window.showQuickPick(picks, {
    placeHolder: 'Select repository to generate commit message for'
  });

  return selected?.repo;
}

async function getApiKey(context) {
  let key = await context.secrets.get('geminiApiKey');
  if (!key) {
    key = await vscode.window.showInputBox({
      prompt: 'Enter your Gemini API key',
      password: true,
    });
    if (key) await context.secrets.store('geminiApiKey', key);
  }
  return key;
}

async function suggestCommitMessage(context) {
  const GEMINI_API_KEY = await getApiKey(context);
  if (!GEMINI_API_KEY) return;

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    const gitExtension = vscode.extensions.getExtension('vscode.git').exports;
    const git = gitExtension.getAPI(1);
    const repo = await getRepo(git);
    if (!repo) return; // ✅ only one check, covers both "no repo" and "user cancelled"

    const repoPath = repo.rootUri.fsPath;
    const diff = execSync('git diff --staged', { cwd: repoPath }).toString();

    if (!diff) {
      vscode.window.showWarningMessage(`No staged files! Run git add first. (${repoPath})`);
      return;
    }


    let message = '';

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: '⏳ Generating commit message...' },
      async () => {
        const result = await model.generateContent(
          `Write a git commit message for this diff. Max 2 lines only.

          Line 1: <type>(<scope>): <what changed> — max 50 chars
          Line 2: (optional) one short sentence on WHY only if needed

          Types: feat, fix, docs, refactor, chore, style, test
          No explanations, no paragraphs, no "This commit...", no periods.

          Diff:
          ${diff}`
        );
        message = result.response.text().trim();
        await vscode.env.clipboard.writeText(message);
      } // ✅ first popup closes here
    );

    // ✅ second popup shows after first is gone
    const action = await vscode.window.showInformationMessage(`✅ ${message}`, 'Fill Commit Box');
    if (action === 'Fill Commit Box') {
      if (repo) repo.inputBox.value = message;
    }

  } catch (err) {
    vscode.window.showErrorMessage(`Error: ${err.message}`);
  }
}




function activate(context) {
  console.log('✅ Extension Activated!');
  const disposable = vscode.commands.registerCommand(
    'gitcommit.suggest',
    () => suggestCommitMessage(context)
  );

  // Update key
  const updateKey = vscode.commands.registerCommand('gitcommit.updateKey', async () => {
    const key = await vscode.window.showInputBox({
      prompt: 'Enter new Gemini API key',
      password: true,
    });
    if (key) {
      await context.secrets.store('geminiApiKey', key);
      vscode.window.showInformationMessage('✅ Gemini API key updated!');
    }
  });

  // Delete key
  const deleteKey = vscode.commands.registerCommand('gitcommit.deleteKey', async () => {
    await context.secrets.delete('geminiApiKey');
    vscode.window.showInformationMessage('🗑️ Gemini API key removed!');
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(updateKey, deleteKey);

}

function deactivate() {}

module.exports = { activate, deactivate };