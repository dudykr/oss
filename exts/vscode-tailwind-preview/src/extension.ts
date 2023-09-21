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
    { from: undefined }
  );

  // console.log('result', css);
  const postcssConfig = await postcssrc(
    {
      cwd: path.dirname(document.fileName),
    },
    document.fileName
  );

  console.log("postcssConfig", postcssConfig);
  const plugins = postcssConfig.plugins;
  const cssResult = await postcss(plugins).process(css, postcssConfig.options);

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
      async (document: vscode.TextDocument, pos: vscode.Position) => {
        PreviewPanel.createOrShow(context.extensionUri, document, pos);
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
        arguments: [document, document.positionAt(tag.opening.start)],
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

  public static readonly viewType = "tailwindPreview";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument,
    pos: vscode.Position
  ) {
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
      "Tailwind Preview",
      column || vscode.ViewColumn.One,
      {}
    );

    PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri);
    PreviewPanel.currentPanel.loadNew(document, pos);
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
    // TODO
  }

  private async loadNew(document: vscode.TextDocument, pos: vscode.Position) {
    const res = await this.getHtmlForWebview(document, pos);
    if (res) {
      this._panel.webview.html = res;
    }
  }

  private async getHtmlForWebview(
    document: vscode.TextDocument,
    pos: vscode.Position
  ) {
    const res = await renderHtml(document, pos, true);
    if (!res) {
      return;
    }
    const [htmlText] = res;

    return htmlText;
  }
}
