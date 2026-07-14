#!/usr/bin/env bash
# One-command Cloudflare Pages deploy for shadow-workipedia.
#
# Prereqs (one-time): wrangler authenticated — check with `wrangler whoami`.
# The Pages project ("shadow-workipedia", production branch main) was created
# 2026-07-14; production URL https://shadow-workipedia.pages.dev.
#
# Usage: ./deploy-cloudflare.sh
#
# Vite copies public/_redirects into dist/ at build, which gives Pages the
# SPA fallback that vercel.json's rewrites provided on Vercel.
set -euo pipefail
cd "$(dirname "$0")"
pnpm build
wrangler pages deploy dist --project-name shadow-workipedia --branch main
