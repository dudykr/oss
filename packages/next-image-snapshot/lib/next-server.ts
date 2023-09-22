import { NextServerOptions } from "next/dist/server/next";
import { getRandomInt } from "./util.js";
import { ChildProcess, spawn } from "child_process";
import waitPort from "wait-port";

export class NextTestServer {
  private constructor(
    private readonly next: ChildProcess,
    private readonly options: NextServerOptions
  ) {}

  public static async create(options?: Exclude<NextServerOptions, "port">) {
    options = options ?? {};
    options.port = getRandomInt(3000, 65000);
    options.hostname ??= "localhost";

    console.log(
      `Starting a next.js app at ${options.dir} at http://localhost:${options.port}`
    );

    const app = spawn(
      "node",
      ["node_modules/next/dist/bin/next", "dev", "-p", options.port.toString()],
      {
        stdio: ["ignore", "inherit", "inherit"],
        cwd: options.dir,
        windowsHide: true,
      }
    );

    // Wait for next.js app to start
    await waitPort({
      host: options.hostname,
      port: options.port,
    });

    const s = new NextTestServer(app, options);

    console.log(`Next.js app is running at ${s.getUrl("/")}`);

    return s;
  }

  getUrl(pathname: string): string {
    return `http://${this.options.hostname ?? "localhost"}:${
      this.options.port
    }${pathname}`;
  }

  async [Symbol.asyncDispose]() {
    await this.close();
  }

  async close() {
    console.log(`Closing a next.js app at ${this.options.dir}`);
    this.next.kill();
  }
}
