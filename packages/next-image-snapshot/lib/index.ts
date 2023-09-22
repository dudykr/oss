export * from "./browser";
export * from "./next-server";

/**
 * A next.js page in app/ directory
 */
export interface NextAppPage {}

/**
 * A next.js page in pages/ directory
 */
export interface NextNormalPage {}

export interface RenderedPage {}

export async function renderPage<P extends NextNormalPage>(
  page: () => Promise<P>
): Promise<RenderedPage> {
  await page();

  return {};
}

export async function renderAppPage<P extends NextAppPage>(
  page: () => Promise<P>
): Promise<RenderedPage> {
  await page();

  return {};
}

type Close =
  | undefined
  | null
  | false
  | 0
  | ""
  | {
      close(): PromiseLike<void>;
    };

/**
 * Falsy values will be ignored.
 */
export type Closable = Close | Iterable<Close>;
/**
 *  Closes every disposable in order, while catching and aggregating all errors.
 *
 *  If an array exists in disposables, all elements of the array will be closed in parallel.
 */
export async function closeAll(...disposables: Closable[]): Promise<void> {
  const errors: unknown[] = [];

  for (const disposable of disposables) {
    try {
      if (!disposable) continue;

      if ("close" in disposable) {
        await disposable.close();
        continue;
      }

      await closeAll(...disposable);
    } catch (e: unknown) {
      errors.push(e);
    }
  }

  if (errors.length > 0) {
    throw errors;
  }
}
