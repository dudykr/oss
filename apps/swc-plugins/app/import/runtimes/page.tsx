export default async function Page() {
  if (process.env.NODE_ENV === "production") {
    return <div>Not allowed</div>;
  }

  for (const runtime of Object.keys(runtimes)) {
    const git = runtimes[runtime].git;
  }
}

export const dynamic = "force-dynamic";

type Git = {
  url: string;
  /**
   * Path to the directory containing `Cargo.lock` within the repository.
   */
  path?: string;
};

type PluginRuntime = {
  git: Git;
};

const runtimes: { [key: string]: PluginRuntime } = {
  "@swc/core": {
    git: {
      url: "https://github.com/swc-project/swc.git",
      path: "bindings",
    },
  },
  next: {
    git: {
      url: "https://github.com/vercel/next.js.git",
    },
  },
  rspack: {
    git: {
      url: "https://github.com/web-infra-dev/rspack.git",
    },
  },
};
