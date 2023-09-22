import { RenderedPage, closeAll } from "./index.js";
import { NextTestServer } from "./next-server.js";
import { Builder, WebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import firefox from "selenium-webdriver/firefox";
import safari from "selenium-webdriver/safari";
import ie from "selenium-webdriver/ie";
import edge from "selenium-webdriver/edge";

type Mapper<T> = (value: T) => T;

type BrowserOptions = {
  common?: {
    /**
     * Defaults to false. If this is false, the CI mode will be enabled automatically by default.
     */
    noCIMode?: boolean;

    headless?: boolean;
    /**
     * Defaults to 800x600
     */
    size?: { width: number; height: number };
  };

  chrome?: Mapper<import("selenium-webdriver/chrome").Options>;
  firefox?: Mapper<import("selenium-webdriver/firefox").Options>;
  safari?: Mapper<import("selenium-webdriver/safari").Options>;

  ie?: Mapper<import("selenium-webdriver/ie").Options>;
  edge?: Mapper<import("selenium-webdriver/edge").Options>;
};

/**
 * Browser[] with some helper methods, including `close()` and `Symbol.asyncDispose`.
 */
export class Browsers {
  constructor(public readonly browsers: readonly Browser[]) {}

  /**
   * Creates an array of browsers. This method will close all browsers if an error occurs.
   */
  public static async all(
    server: NextTestServer,
    browsers: string[],
    options?: BrowserOptions
  ): Promise<Browsers> {
    const built = await Promise.allSettled(
      browsers.map((browser) => Browser.create(server, browser, options))
    );

    // This will close all browsers if an error occurs.
    if (built.some((result) => result.status === "rejected")) {
      await closeAll(built.map((result) => "value" in result && result.value));
    }

    // `await` above will make this code path unreachable if an error occurs.

    return new Browsers(
      built.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          throw result.reason;
        }
      })
    );
  }

  public async [Symbol.asyncDispose]() {
    await this.close();
  }

  public async close() {
    await closeAll(this.browsers);
  }

  public get drivers(): WebDriver[] {
    return this.browsers.map((browser) => browser.driver);
  }

  [Symbol.iterator]() {
    return this.browsers[Symbol.iterator]();
  }
}

/**
 * An instance of browser which is bound to a [NextTestServer]
 */
export class Browser {
  constructor(
    private readonly server: NextTestServer,
    public readonly driver: WebDriver,
    public readonly name: string
  ) {}

  public static async create(
    server: NextTestServer,
    browser: string,
    options?: BrowserOptions
  ): Promise<Browser> {
    options ??= {};
    options.common ??= {};
    options.common.size ??= {
      width: 800,
      height: 600,
    };

    const builder = new Builder().forBrowser(browser);

    const enableCI = !options.common.noCIMode && !!process.env.CI;

    if (enableCI) {
      console.warn(
        "CI mode is enabled. This will disable GPU acceleration and sandboxing."
      );
    }

    {
      let opts = new chrome.Options();
      if (options?.common?.headless) {
        opts = opts.headless();
      }
      if (options.common.size) {
        opts = opts.windowSize(options.common.size);
      }

      // Make sure that the screenshot is not scaled on mac OS X.
      opts = opts.addArguments("--force-device-scale-factor=1");
      if (enableCI) {
        // https://github.com/actions/runner-images/issues/506#issuecomment-595731397
        opts = opts.addArguments(
          "--no-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "disable-infobars",
          "--disable-extensions"
        );
      }
      if (options.chrome) {
        opts = options.chrome(opts);
      }
      builder.setChromeOptions(opts);
    }
    {
      let opts = new ie.Options();
      if (options.ie) {
        opts = options.ie(opts);
      }
      builder.setIeOptions(opts);
    }
    {
      let opts = new edge.Options();
      if (options?.common?.headless) {
        opts = opts.headless();
      }
      if (options.common.size) {
        opts = opts.windowSize(options.common.size);
      }
      if (options.edge) {
        opts = options.edge(opts);
      }
      builder.setEdgeOptions(opts);
    }
    {
      let opts = new firefox.Options();
      if (options?.common?.headless) {
        opts = opts.headless();
      }
      if (options.common.size) {
        opts = opts.windowSize(options.common.size);
      }
      if (options.firefox) {
        opts = options.firefox(opts);
      }
      builder.setFirefoxOptions(opts);
    }
    {
      let opts = new safari.Options();

      if (options.safari) {
        opts = options.safari(opts);
      }
      builder.setSafariOptions(opts);
    }

    const driver = await builder.build();

    return new Browser(server, driver, browser);
  }

  public async load(pathname: string): Promise<RenderedPage> {
    console.log(`Rendering ${pathname}...`);

    await this.driver.get(this.server.getUrl(pathname));

    return {};
  }

  public async [Symbol.asyncDispose]() {
    await this.close();
  }

  public async close() {
    await this.driver.quit();
  }
}
