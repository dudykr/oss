import { describe, it, beforeEach, afterEach, expect } from "@jest/globals";
import { NextTestServer } from "../lib/next-server.js";
import "jest-expect-image";
import { Builder, ThenableWebDriver } from "selenium-webdriver";
import { closeAll } from "../lib/index.js";
import chrome from "selenium-webdriver/chrome";

describe("NextTestServer", () => {
  let driver!: Awaited<ThenableWebDriver>;
  let server!: NextTestServer;

  beforeEach(async () => {
    server = await NextTestServer.create({
      dir: "./examples/next-app",
      dev: true,
    });
  });

  beforeEach(async () => {
    const builder = new Builder().forBrowser("chrome");
    driver = await builder
      .setChromeOptions(
        new chrome.Options()
          .headless()
          .windowSize({
            width: 800,
            height: 600,
          })
          .addArguments(
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "disable-infobars",
            "--disable-extensions",
            "--force-device-scale-factor=1"
          )
      )
      .build();
  });

  afterEach(async () => {
    await closeAll(driver, server);
  });

  describe("proof of concepts", () => {
    it("works", async () => {
      console.log(`Url: ${server.getUrl("/")}`);

      await driver.get(server.getUrl("/"));
      const image = await driver.takeScreenshot();

      expect(image).toMatchImageSnapshot({
        comparisonMethod: "ssim",
        failureThreshold: 0.05,
        failureThresholdType: "percent",
        dumpDiffToConsole: true,
      });
    });
  });
});
