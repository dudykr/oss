#!/usr/bin/env node
import fs from "fs/promises";

await fs.mkdir("./.cache", { recursive: true });

// Fetch .cahce/swc_core.json from https://index.crates.io/sw/c_/swc_core if it doesn't exist
async function load(crate) {
  const cachePath = `./.cache/${crate}.json`;
  try {
    return await fs.readFile(cachePath, "utf8");
  } catch (e) {
    console.log(`Cache miss for ${crate}`);
  }

  const response = await fetch(`https://index.crates.io/sw/c_/${crate}`);
  const content = await response.text();
  await fs.writeFile(cachePath, content, "utf8");
  return content;
}

const [coreData, pluginRunnerData] = await Promise.all([
  load("swc_core"),
  load("swc_plugin_runner"),
]);

for (const line of coreData.split("\n")) {
  const data = JSON.parse(line);

  const pluginRunner = data.deps.find((d) => d.name === "swc_plugin_runner");
  console.log(pluginRunner);
}
