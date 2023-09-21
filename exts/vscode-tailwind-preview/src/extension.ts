import * as vscode from "vscode";
import * as path from "path";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { findMatchingTag, getTagForPosition } from "./tokenizer/tagMatcher";
import { parseTags } from "./tokenizer/tagParser";
import resolveConfig from "tailwindcss/resolveConfig";

/// Check if the current text looks like a tailwind component.
async function renderHtml(
  document: vscode.TextDocument,
  position: vscode.Position
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

  const range = new vscode.Range(
    document.positionAt(tag.opening.start),
    document.positionAt(tag.closing.end)
  );
  const htmlContent = document.getText(range);

  const processor = postcss(tailwindcss("./tailwind.config.js"));
  const cssResult = processor.process(
    `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    `
  );
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

  return [htmlContent, range];
}

export function activate(context: vscode.ExtensionContext) {
  // Show image on hover
  const hoverProvider: vscode.HoverProvider = {
    async provideHover(document, position) {
      const rendeded = await renderHtml(document, position);
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

      return new vscode.Hover(content, new vscode.Range(position, position));
    },
  };

  for (const lang of ["jest-snapshot"]) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(lang, hoverProvider)
    );
  }
}
