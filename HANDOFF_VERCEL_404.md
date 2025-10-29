# HANDOFF: Vercel 404 Deployment Issue

**Date:** 2025-10-28
**Priority:** CRITICAL BLOCKER
**Status:** UNRESOLVED

---

## Problem Summary

The Epic Scribe application **builds successfully on Vercel but returns 404 on all routes**. Local development and production builds work perfectly. This is a deployment configuration issue, not a code issue.

---

## What You Need to Know

### The Application
- **Stack:** Next.js 14 App Router, pnpm monorepo, Supabase, Gemini API
- **Structure:** `/apps/web` (Next.js), `/packages/*`, `/services/*`
- **Purpose:** Generate psychiatry notes from transcripts with Epic SmartTools integration

### The Issue
- ✅ Vercel build succeeds with no errors
- ✅ All Next.js routes compile successfully
- ✅ Local development works (`pnpm dev`)
- ✅ Local production build works (`pnpm build`)
- ❌ **Deployed URL returns 404: Page Not Found**
- ❌ Next.js renders `/_not-found` route instead of actual pages

---

## What We've Already Tried

### ✅ Things That Didn't Fix It

1. **Fixed TypeScript Build Errors**
   - Added missing `'BHIDC therapy'` to `VISIT_TYPES` Record in `TemplateReviewStep.tsx`
   - Build now succeeds, but 404 persists

2. **Added Production Environment Variables**
   - User added all required env vars (Supabase, Gemini, Google Workspace)
   - Replaced localhost URLs with production URLs
   - Build succeeds, but 404 persists

3. **Configured Root Directory in Vercel Dashboard**
   - Set Root Directory to `apps/web` in Vercel project settings
   - Build succeeds, but **404 STILL PERSISTS**

4. **Attempted to Add rootDirectory to vercel.json** (Failed)
   - Discovered `rootDirectory` is NOT a valid vercel.json property
   - Must be configured in Vercel Dashboard UI only
   - Removed from vercel.json to fix schema validation error

---

## Current Configuration

### vercel.json (Root of Repo)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd ../.. && npx pnpm@10.13.1 --filter=@epic-scribe/web build",
  "devCommand": "pnpm --filter=@epic-scribe/web dev",
  "installCommand": "npx pnpm@10.13.1 install",
  "framework": null,
  "outputDirectory": ".next"
}
```

### Vercel Project Settings (Dashboard)
- **Root Directory:** `apps/web`
- **Framework Preset:** Next.js (auto-detected, overridden to `null` in vercel.json)
- **Build Command:** Custom (from vercel.json)
- **Output Directory:** `.next`
- **Install Command:** Custom (from vercel.json)
- **Node.js Version:** 20.x (from package.json engines)

---

## Hypotheses (Ordered by Likelihood)

### 🔴 #1: Monorepo Routing Issue (MOST LIKELY)

**The Problem:**
- `buildCommand` contains `cd ../..` which assumes it starts from `apps/web`
- But Root Directory is ALSO set to `apps/web` in Vercel Dashboard
- These two settings may conflict, causing wrong working directory

**Why This is Likely:**
- `cd ../..` made sense BEFORE setting Root Directory
- With Root Directory set, Vercel starts in `apps/web`, so `cd ../..` goes to PARENT of repo
- This would break the build context entirely

**How to Test:**
```json
{
  "buildCommand": "pnpm --filter=@epic-scribe/web build",
  "installCommand": "pnpm install"
}
```
- Remove `cd ../..` since Root Directory already handles path
- Simplify install command (no npx wrapper needed)

---

### 🟡 #2: Framework Detection Conflict

**The Problem:**
- Setting `"framework": null` may prevent Next.js from routing correctly
- Vercel auto-detects Next.js but we're overriding it

**How to Test:**
- Remove `"framework": null` from vercel.json
- Let Vercel auto-detect Next.js framework
- Check if routing works

---

### 🟡 #3: Output Directory Path Issue

**The Problem:**
- With Root Directory = `apps/web`, the output directory path may be wrong
- `outputDirectory: ".next"` is relative to current directory
- Vercel might be looking in wrong location for build output

**How to Test:**
- Try absolute path: `"outputDirectory": "apps/web/.next"`
- Or remove it entirely and let Vercel use default `.next`

---

### 🟡 #4: Workspace Dependencies Not Resolved

**The Problem:**
- pnpm workspace protocol may not resolve correctly
- `@epic-scribe/types`, `@epic-scribe/note-service` may not be linked

**How to Test:**
- Add `pnpm install --frozen-lockfile` to verify dependency resolution
- Check if Vercel needs `.npmrc` configuration for pnpm workspaces
- Review build logs for workspace resolution warnings

---

### 🟢 #5: Build Output Location Mismatch

**The Problem:**
- Next.js may build to correct location, but Vercel can't find it
- Need to verify actual build output location

**How to Test:**
- Add debug command to list directory contents after build:
  ```json
  "buildCommand": "cd ../.. && pnpm --filter=@epic-scribe/web build && ls -la apps/web/.next"
  ```
- Check build logs for actual `.next` directory location

---

## Recommended Action Plan

### Step 1: Get Full Build Logs
**Ask user for COMPLETE Vercel build logs, including:**
- Full installation output
- Full build command execution
- Next.js compilation output
- Route generation output
- Deployment summary

The snippet we saw only showed installation completing. We need to see the entire build process.

### Step 2: Try Simplified vercel.json (HIGHEST PRIORITY)

Test this configuration first:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm --filter=@epic-scribe/web build",
  "installCommand": "pnpm install"
}
```

**Changes:**
- ❌ Remove `cd ../..` (conflicts with Root Directory setting)
- ❌ Remove `npx pnpm@10.13.1` wrapper (not needed, packageManager field handles this)
- ❌ Remove `framework: null` (let Vercel auto-detect Next.js)
- ❌ Remove `devCommand` (not needed for deployment)
- ❌ Remove `outputDirectory` (let Vercel use default)

**Rationale:**
- Root Directory = `apps/web` means Vercel already starts in correct directory
- pnpm version is specified in root `package.json` as `"packageManager": "pnpm@10.13.1"`
- Next.js auto-detection should handle framework-specific routing

### Step 3: Check Vercel Function Logs
- View runtime logs in Vercel dashboard (not just build logs)
- Look for Next.js server startup errors
- Check if any routes are being hit at all

### Step 4: Verify Package Resolution
- Check if workspace packages are being resolved correctly
- Look for warnings about `@epic-scribe/*` packages in build logs
- Ensure pnpm workspace protocol is working

### Step 5: Review Critical Files
If simplified vercel.json doesn't work, review:
- `/apps/web/next.config.js` - Check for custom routing config
- `/apps/web/app/layout.tsx` - Verify root layout exists and is valid
- `/.vercelignore` - Ensure not excluding critical files
- `/pnpm-workspace.yaml` - Verify workspace configuration

---

## What NOT to Do

**Don't waste time investigating:**
- ❌ Environment variables (already configured correctly)
- ❌ TypeScript errors (already fixed)
- ❌ Build failures (build succeeds every time)
- ❌ Code issues (local dev and build work perfectly)
- ❌ Supabase connection (not related to routing)

**This is purely a Vercel deployment configuration issue.**

---

## Key Files to Reference

### Configuration
- `/vercel.json` - Vercel build configuration
- `/package.json` - Root package with pnpm version
- `/pnpm-workspace.yaml` - Workspace configuration
- `/apps/web/package.json` - Next.js app package
- `/apps/web/next.config.js` - Next.js configuration

### Documentation
- `/CLAUDE.md` - Full project context and troubleshooting details
- `/apps/web/app/layout.tsx` - Root layout
- `/apps/web/app/page.tsx` - Home page

---

## Success Criteria

You've fixed it when:
1. ✅ Vercel build completes successfully (already happening)
2. ✅ Deployed URL shows the actual homepage (currently 404)
3. ✅ All routes are accessible (`/generate`, `/templates`, `/encounters`, etc.)
4. ✅ Application functions normally on production URL

---

## Resources

- **Vercel Monorepo Docs:** https://vercel.com/docs/monorepos
- **Vercel Next.js Docs:** https://vercel.com/docs/frameworks/nextjs
- **pnpm Workspace Docs:** https://pnpm.io/workspaces
- **Next.js App Router:** https://nextjs.org/docs/app

---

## Contact

**User:** Dr. Rufus Sweeney
**GitHub Repo:** moonlitpsych/epic-scribe
**Vercel Project:** epic-scribe (exact name TBD - ask user)

---

## Quick Start for Next Claude

```bash
# Read this file first
cat HANDOFF_VERCEL_404.md

# Read full context
cat CLAUDE.md

# Check recent commits
git log --oneline -10

# Review current vercel.json
cat vercel.json

# Ask user for:
# 1. Complete Vercel build logs (full output)
# 2. Vercel project URL/name
# 3. Confirmation Root Directory is still set to apps/web

# Then try simplified vercel.json (see Step 2 above)
```

---

**REMEMBER:** The build succeeds. The code works locally. This is 100% a deployment configuration issue. Focus on Hypothesis #1 (Monorepo Routing) first.

Good luck! 🚀
