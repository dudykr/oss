import * as vscode from "vscode";
import * as path from "path";
import { findMatchingTag, getTagForPosition } from "./tokenizer/tagMatcher";
import { parseTags } from "./tokenizer/tagParser";

/// Check if the current text looks like a tailwind component.
function renderHtml(
  document: vscode.TextDocument,
  position: vscode.Position
): [string, vscode.Range] | undefined {
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
  return [document.getText(range), range];
}

export function activate(context: vscode.ExtensionContext) {
  // Show image on hover
  const hoverProvider: vscode.HoverProvider = {
    async provideHover(document, position) {
      const rendeded = renderHtml(document, position);
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
