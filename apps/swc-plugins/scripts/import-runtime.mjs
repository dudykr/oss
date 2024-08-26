#!/usr/bin/env zx
//
// Run this script using an absolute path to the runtime directory.
import toml from "toml";
import { $ } from "zx";

const runtimeDir = process.argv[2];

if (!runtimeDir) {
  console.error("Runtime directory is required");
  process.exit(1);
}

// Get all git tags
const gitTags = await $`git tag`.text();

// For each tag, get the content of `${runtimeDir}/Cargo.lock`.
for (const tag of gitTags) {
  try {
    const cargoLock = await $`git show ${tag}:${runtimeDir}/Cargo.lock`.text();
    console.log(cargoLock);

    const parsed = toml.parse(cargoLock);
  } catch (e) {
    console.error(`Failed to parse Cargo.lock for tag ${tag}: ${e}`);
  }
}
