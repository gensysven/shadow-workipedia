#!/usr/bin/env bash
# Reproducible baseline checks for shadow-workipedia, executed only inside a
# fresh fleet guest (Ubuntu 24.04 x86_64). The guest receives this repository
# and nothing else: no credentials, no host worktrees, no parent repository.
#
# The repository pins no toolchain of its own — no packageManager field, no
# engines, no .nvmrc — and the guest image ships neither Node nor pnpm, so both
# are pinned here by content hash. Versions match what the site is developed
# and deployed with: Node 22.22.3, pnpm 9.0.0 against lockfileVersion 9.0.
set -euo pipefail
umask 022

NODE_VERSION=22.22.3
NODE_SHA256=2e5d13569282d016861fae7c8f935e741693c269101a5bebcf761a5376d1f99f
PNPM_VERSION=9.0.0
PNPM_SHA256=bdfc9a7b372b5c462176993e586492603e20da5864d2f8881edc2462482c76fa

tools=$(mktemp -d)
trap 'rm -rf "$tools"' EXIT

curl --fail --location --retry 3 --silent --show-error \
  "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
  -o "$tools/node.tar.xz"
printf '%s  %s\n' "$NODE_SHA256" "$tools/node.tar.xz" | sha256sum --check -
tar -xJf "$tools/node.tar.xz" -C "$tools"
export PATH="$tools/node-v${NODE_VERSION}-linux-x64/bin:$PATH"

curl --fail --location --retry 3 --silent --show-error \
  "https://registry.npmjs.org/pnpm/-/pnpm-${PNPM_VERSION}.tgz" \
  -o "$tools/pnpm.tgz"
printf '%s  %s\n' "$PNPM_SHA256" "$tools/pnpm.tgz" | sha256sum --check -
mkdir -p "$tools/pnpm" "$tools/bin"
tar -xzf "$tools/pnpm.tgz" -C "$tools/pnpm" --strip-components=1
# bin/pnpm.cjs carries a node shebang; expose it under the expected name.
ln -s "$tools/pnpm/bin/pnpm.cjs" "$tools/bin/pnpm"
export PATH="$tools/bin:$PATH"

node --version
pnpm --version

# Keep the store inside the guest's scratch space rather than $HOME.
export PNPM_HOME="$tools/pnpm-home"
export npm_config_store_dir="$tools/pnpm-store"

# The documented commands, from CLAUDE.md and package.json.
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:router

# public/graph.json and public/articles.json are committed artifacts on purpose:
# scripts/extract-data.ts reads ../docs and ../data from the parent shadow-work
# repository, which a single-repo guest does not have. `build` (not
# `build:full`) is therefore the correct command here, and it is the same one
# the deployed build runs.
pnpm build

# A green build that produced no deployable output is not a green build.
test -f dist/index.html
test -s dist/graph.json
test -s dist/articles.json

# shellcheck disable=SC2016  # the node script must not be shell-expanded
node -e '
const fs = require("fs");
const d = JSON.parse(fs.readFileSync("dist/graph.json", "utf8"));
const a = JSON.parse(fs.readFileSync("dist/articles.json", "utf8"));
const issues = d.nodes.filter(n => n.type === "issue").length;
const systems = d.nodes.filter(n => n.type === "system").length;
if (issues < 300) throw new Error(`expected 300+ issue nodes, got ${issues}`);
if (systems < 20) throw new Error(`expected 20+ system nodes, got ${systems}`);
if (!d.edges.some(e => e.type === "issue-system")) throw new Error("no issue-system edges");
if (d.articles) throw new Error("graph.json must not carry articles — that split is the point");
const articleCount = Object.keys(a).length;
if (articleCount < 1000) throw new Error(`expected 1000+ articles, got ${articleCount}`);
// The graph is what blocks the first paint, so hold the line on its size.
const graphBytes = fs.statSync("dist/graph.json").size;
if (graphBytes > 4e6) throw new Error(`graph.json grew to ${graphBytes} bytes; keep the prose in articles.json`);
console.log(`graph.json: ${issues} issues, ${systems} systems, ${d.edges.length} edges, ${(graphBytes/1e6).toFixed(2)} MB`);
console.log(`articles.json: ${articleCount} articles`);
'

echo "shadow-workipedia baseline checks: ok"
