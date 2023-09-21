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
        command: "dudy.tailwind-preview.open",
        arguments: [document.uri, range],
      });

      codeLenses.push(codeLens);
    }

    return codeLenses;
  }

  // async resolveCodeLens?(
  //   codeLens: vscode.CodeLens,
  //   token: vscode.CancellationToken
  // ): vscode.ProviderResult<vscode.CodeLens> { }
}
