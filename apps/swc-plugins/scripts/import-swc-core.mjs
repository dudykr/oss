#!/usr/bin/env node
import fs from "fs/promises";

await fs.mkdir("./.cache", { recursive: true });

// Fetch .cahce/swc_core.json from https://index.crates.io/sw/c_/swc_core if it doesn't exist
if (!fs.existsSync("./.cache/swc_core.json")) {
  const response = await fetch("https://index.crates.io/sw/c_/swc_core");
  const content = await response.text();
  await fs.writeFile("./.cache/swc_core.json", content, "utf8");
}

// swc_core.json: https://index.crates.io/sw/c_/swc_core
const content = await fs.readFile("./.cache/swc_core.json", "utf8");

for (const line of content.split("\n")) {
  const data = JSON.parse(line);

  const pluginRunner = data.deps.find((d) => d.name === "swc_plugin_runner");
  console.log(pluginRunner);
}
