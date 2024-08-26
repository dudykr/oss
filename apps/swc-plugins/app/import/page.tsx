import fs from "node:fs/promises";

export default async function Page() {
  const plugins = JSON.parse(
    await fs.readFile("./data/.cache/plugins.json", "utf8")
  );
}
