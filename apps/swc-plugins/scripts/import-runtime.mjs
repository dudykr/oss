#!/usr/bin/env zx
//
// Run this script using an absolute path to the runtime directory.
import { $ } from "zx";

const runtimeDir = process.argv[2];

if (!runtimeDir) {
  console.error("Runtime directory is required");
  process.exit(1);
}

// Get all git tags.

const gitTags = await $`git tag`.text();
