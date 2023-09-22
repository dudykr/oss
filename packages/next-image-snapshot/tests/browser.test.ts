import { describe, it, beforeEach, afterEach, expect } from "@jest/globals";
import { NextTestServer } from "../lib/next-server.js";
import "jest-expect-image";
import { Browsers } from "../lib/browser.js";
import { closeAll } from "../lib/index.js";

describe("Browser", () => {
  let server!: NextTestServer;
  let browsers!: Browsers;

  beforeEach(async () => {
    server = await NextTestServer.create({
      dir: "./examples/next-app",
      dev: true,
    });
    browsers = await Browsers.all(server, ["chrome", "firefox"], {
      common: {
        headless: true,
        size: {
          width: 1080,
          height: 720,
        },
      },
    });
  });

  afterEach(async () => {
    await closeAll(browsers, server);
  });

  describe("screenshot", () => {
    it("works", async () => {
      for (const browser of browsers) {
        await browser.load("/");

        const screenshot = await browser.driver.takeScreenshot();

        expect(screenshot).toMatchImageSnapshot({
          comparisonMethod: "ssim",
          failureThreshold: 0.05,
          failureThresholdType: "percent",
          dumpDiffToConsole: true,
        });
      }
    });
  });
});

describe("Browsers.all()", () => {
  let server!: NextTestServer;

  beforeEach(async () => {
    server = await NextTestServer.create({
      dir: "./examples/next-app",
      dev: true,
    });
  });

  afterEach(async () => {
    await closeAll(server);
  });

  describe("options.common", () => {
    let server!: NextTestServer;

    beforeEach(async () => {
      server = await NextTestServer.create({
        dir: "./examples/next-app",
        dev: true,
      });
    });

    afterEach(async () => {
      await closeAll(server);
    });

    describe("headless", () => {
      it("should propagate to all browsers", async () => {
        const browsers = await Browsers.all(server, ["chrome"], {
          common: {
            headless: true,
          },
        });

        try {
          for (const browser of browsers) {
            const cap = await browser.driver.getCapabilities();
            console.log(cap);
            // expect(cap.get("goog:chromeOptions").args).toContain("--headless");
          }
        } finally {
          await closeAll(browsers);
        }
      });
    });
  });

  describe("when a browser is not installed", () => {
    it("should throw an error", async () => {
      expect(
        Browsers.all(server, ["chrome", "unknown-browser"], {
          common: {
            headless: true,
          },
        })
      ).rejects.toBeInstanceOf(Error);
    });

    it("should close other browsers", async () => {
      // TODO: Check browsers
      try {
        await Browsers.all(server, ["chrome", "unknown-browser"], {
          common: {
            headless: true,
          },
        });
      } catch (e: unknown) {
        console.log(e);
      }
    });
  });
});
