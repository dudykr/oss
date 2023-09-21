import * as vscode from "vscode";
import * as path from "path";
import postcss from "postcss";
import postcssrc from "postcss-load-config";
import tailwindcss from "tailwindcss";
import {
  findMatchingTag,
  getTagForPosition,
  getTagsForPosition,
  getValidTags,
} from "./tokenizer/tagMatcher";
import { parseTags } from "./tokenizer/tagParser";
import resolveConfig from "tailwindcss/resolveConfig";
import { Match } from "./tokenizer/interfaces";

const COMMAND_OPEN_PREVIEW = "dudy.tailwind-preview.open";

/**
 *
 */
async function renderTag(
  document: vscode.TextDocument,
  tag: Match,
  styled: boolean
): Promise<[string, vscode.Range] | undefined> {
  if ("jest-snapshot" !== document.languageId) {
    return undefined;
  }

  const range = new vscode.Range(
    document.positionAt(tag.opening.start),
    document.positionAt(tag.closing.end)
  );
  const htmlContent = document.getText(range);

  if (!styled) {
    return [htmlContent, range];
  }

  const css = postcss.parse(
    `
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  `,
    { from: document.fileName }
  );

  // console.log('result', css);
  const postcssConfig = await postcssrc({}, document.fileName);

  const plugins = postcssConfig.plugins;
  const cssResult = await postcss(plugins).process(css);

  const finalHtml = `
  <html>
    <head>
      <style>
        ${cssResult.css}
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
  </html>`;

  return [finalHtml.trim(), range];
}

/// Check if the current text looks like a tailwind component.
async function renderHtml(
  document: vscode.TextDocument,
  position: vscode.Position,
  styled: boolean
): Promise<[string, vscode.Range] | undefined> {
  if ("jest-snapshot" !== document.languageId) {
    return undefined;
  }

  const text = document.getText();
  const tags = parseTags(text);

  const tag = getTagForPosition(tags, document.offsetAt(position), true);
  if (!tag) {
    return;
  }

  return await renderTag(document, tag, styled);
}

export function activate(context: vscode.ExtensionContext) {
  // Show image on hover
  const hoverProvider: vscode.HoverProvider = {
    async provideHover(document, position) {
      const rendeded = await renderHtml(document, position, false);
      if (!rendeded) {
        return;
      }
      const [htmlText, range] = rendeded;

      const content = new vscode.MarkdownString(htmlText);

      content.supportHtml = true;

      content.isTrusted = true;

      content.supportThemeIcons = true; // to supports codicons

      // baseUri was necessary, full path in the img src did not work
      // with your icons stroed in the 'images' directory
      content.baseUri = vscode.Uri.file(
        path.join(context.extensionPath, "images", path.sep)
      );

      return new vscode.Hover(content, range);
    },
  };

  for (const lang of ["jest-snapshot"]) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(lang, hoverProvider)
    );
  }

  // HoverProvider does not support styling, so we need to use a Webview.
  // Instead of using a command pallette, we use a code lens to show the "open preview" button.
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      "jest-snapshot",
      new PreviewCodeLensProvider()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_OPEN_PREVIEW,
      async (documentUri, range) => {
        PreviewPanel.createOrShow(documentUri, range);
      }
    )
  );
}

class PreviewCodeLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const text = document.getText();
    const tags = getValidTags(parseTags(text));

    const codeLenses: vscode.CodeLens[] = [];

    for (const tag of tags) {
      const range = new vscode.Range(
        document.positionAt(tag.opening.start),
        document.positionAt(tag.closing.end)
      );

      const codeLens = new vscode.CodeLens(range, {
        title: "Preview",
        command: COMMAND_OPEN_PREVIEW,
        arguments: [document.uri, range],
      });

      codeLenses.push(codeLens);
    }

    return codeLenses;
  }
}

class PreviewPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: PreviewPanel | undefined;

  public static readonly viewType = "catCoding";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, pos: vscode.Position) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      PreviewPanel.viewType,
      "Cat Coding",
      column || vscode.ViewColumn.One,
      getWebviewOptions(extensionUri)
    );

    PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      (e) => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "alert":
            vscode.window.showErrorMessage(message.text);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public doRefactor() {
    // Send a message to the webview webview.
    // You can send any JSON serializable data.
    this._panel.webview.postMessage({ command: "refactor" });
  }

  public dispose() {
    PreviewPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;

    // Vary the webview's content based on where it is located in the editor.
    switch (this._panel.viewColumn) {
      case vscode.ViewColumn.Two:
        this._updateForCat(webview, "Compiling Cat");
        return;

      case vscode.ViewColumn.Three:
        this._updateForCat(webview, "Testing Cat");
        return;

      case vscode.ViewColumn.One:
      default:
        this._updateForCat(webview, "Coding Cat");
        return;
    }
  }

  private _updateForCat(webview: vscode.Webview, catName: keyof typeof cats) {
    this._panel.title = catName;
    this._panel.webview.html = this._getHtmlForWebview(webview, cats[catName]);
  }

  private async _getHtmlForWebview(
    webview: vscode.Webview,
    document: vscode.TextDocument,
    pos: vscode.Position
  ) {
    // Local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "main.js"
    );

    // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "reset.css"
    );
    const stylesPathMainPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "vscode.css"
    );

    // Uri to load styles into webview
    const stylesResetUri = webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

    // Use a nonce to only allow specific scripts to be run

    const res = await renderHtml(document, pos, true);
    if (!res) {
      return;
    }
    const [htmlText] = res;

    return htmlText;
  }
}
