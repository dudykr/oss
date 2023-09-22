# next-image-snapshot

## Usage

Assuming you are using `jest`, you can use this package like

```ts
// This import will add `toMatchImageSnapshot` to the `expect` global, and will make IDE autocomplete work.
import "jest-expect-image";
import { Browsers, NextTestServer, closeAll } from "next-image-snapshot";

describe("User sign up page", () => {
  let server!: NextTestServer;
  let browsers!: Browsers;

  beforeAll(async () => {
    server = await NextTestServer.create({
      dir: "./examples/next-app",
      dev: true,
    });
    browsers = await Browsers.all(server, ["chrome", "firefox", "edge"], {
      common: {
        headless: true,
      },
    });
  });

  afterAll(async () => {
    await closeAll(browsers, server);
  });

  it("renders properly in all browsers", async () => {
    for (const browser of browsers) {
      await browser.load("/");

      const screenshot = await browser.driver.takeScreenshot();

      expect(screenshot).toMatchImageSnapshot();
    }
  });
});
```

Note the `NestTestServer`, `Browser` and `Browsers` all support `[Symbol.asyncDispose]`.
It means, once TypeScript 5.2 is released, you will be able to do this:

```ts
import "jest-expect-image";
import { Browsers, NextTestServer, closeAll } from "next-image-snapshot";

describe("User sign up page", () => {
  it("renders properly in all browsers", async () => {
    using server = await NextTestServer.create({
        dir: "./examples/next-app",
        dev: true,
    });
    using browsers = await Browsers.all(server, ["chrome", "firefox", "edge"], {
        common: {
            headless: true,
        },
    });

    for (const browser of browsers) {
      await browser.load("/");

      const screenshot = await browser.driver.takeScreenshot();

      expect(screenshot).toMatchImageSnapshot();
    }
  });
});
```

### TODO: `renderAppPage`

```ts
const page = await renderAppPage(() => import("./page.tsx"));
```

### TODO: `renderPage`

```ts
const page = await renderPage(() => import("./page.tsx"));
```
