#!/usr/bin/env zx
//
// Run this script using an absolute path to the runtime directory.
import path from "path";
import toml from "toml";
import { $ } from "zx";

const runtimeDir = process.argv[2];

if (!runtimeDir) {
  console.error("Runtime directory is required");
  process.exit(1);
}
const $$ = $({ cwd: runtimeDir });

const repositoryRoot = (await $$`git rev-parse --show-toplevel`.text()).trim();
const cargoLockPath = path.resolve(`${runtimeDir}/Cargo.lock`);
const relativePathToCargoLock = path.relative(repositoryRoot, cargoLockPath);

console.log("Runtime dir:", runtimeDir);
console.log("Repository root:", repositoryRoot);
console.log("Cargo.lock path:", cargoLockPath);
console.log("Relative path to Cargo.lock:", relativePathToCargoLock);

if (!relativePathToCargoLock.startsWith("..")) {
  console.error(
    "Runtime directory is not a subdirectory of the repository root"
  );
  process.exit(1);
}

// Get all git tags

const gitTags = (await $$`git tag`.text()).split("\n");

// For each tag, get the content of `${runtimeDir}/Cargo.lock`.
for (const tag of gitTags) {
  try {
    const cargoLock =
      await $$`git show ${tag}:${relativePathToCargoLock}`.text();
    console.log(cargoLock);

    const parsed = toml.parse(cargoLock);
  } catch (e) {
    console.error(`Failed to parse Cargo.lock for tag ${tag}: ${e}`);
  }
}
