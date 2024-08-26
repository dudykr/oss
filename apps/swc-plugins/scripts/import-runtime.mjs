#!/usr/bin/env node
//
// Run this script using an absolute path to the runtime directory.

const runtimeDir = process.argv[2];

if (!runtimeDir) {
  console.error("Runtime directory is required");
  process.exit(1);
}
