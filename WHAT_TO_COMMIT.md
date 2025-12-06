# What to Commit to GitHub

**Purpose:** Clear guide on what files should and shouldn't be committed

---

## ✅ Files TO Commit

### Essential Documentation
- ✅ `README.md` - Main project documentation (REQUIRED)
- ✅ `LICENSE` - License file (REQUIRED)
- ✅ `COMMIT_AND_BUILD_GUIDE.md` - Build instructions (useful)
- ✅ `GITHUB_READINESS_CHECKLIST.md` - GitHub setup reference (optional)

### GitHub Configuration
- ✅ `.github/workflows/build.yml` - Build workflow
- ✅ `.github/workflows/release.yml` - Release workflow
- ✅ `.github/PULL_REQUEST_TEMPLATE.md` - PR template
- ✅ `.github/ISSUE_TEMPLATE/bug_report.md` - Bug template
- ✅ `.github/ISSUE_TEMPLATE/feature_request.md` - Feature template

### Design System (Optional but Recommended)
- ✅ `Design System/design-system-guide.md` - Design system documentation
- ✅ `Design System/design-tokens.css` - Design tokens

### Source Code
- ✅ `frontend/` - All frontend source code
- ✅ `src-tauri/` - All Rust backend code (except target/)
- ✅ `package.json`, `package-lock.json` - Dependencies
- ✅ `Cargo.toml`, `Cargo.lock` - Rust dependencies

### Configuration Files
- ✅ `.gitignore` - Git ignore rules
- ✅ `tauri.conf.json` - Tauri configuration
- ✅ `tsconfig.json`, `vite.config.ts` - Frontend configs
- ✅ `vitest.config.ts` - Test configuration
- ✅ `playwright.config.ts` - E2E test configuration

### Icons & Assets
- ✅ `src-tauri/icons/` - App icons

---

## ❌ Files NOT to Commit

### Development Scripts
- ❌ `*.sh` files (cleanup.sh, DEBUG_HTTP.sh, etc.)
  - These are local development/testing scripts
  - Not needed for building or using the app

### Planning/Analysis Documentation
- ❌ `LAUNCH_*.md` - Launch planning docs (internal)
- ❌ `STARTUP_DIAGNOSIS.md` - Performance analysis (internal)
- ❌ `PROJECT_STATUS.md` - Project status (internal)
- ❌ `PHASE*.md` - Phase checkpoints (internal)
- ❌ `HISTORY_PHASES_STATUS.md` - History (internal)
- ❌ `CONNECTIONS_*.md` - Design analysis (internal)
- ❌ `TOOLBAR_*.md` - Design analysis (internal)
- ❌ `UI_DESIGN_OPTIONS.md` - Design exploration (internal)
- ❌ `ACTION_RAIL_COMMANDS.md` - Internal notes
- ❌ `LOCAL_SVN_SERVER_SETUP.md` - Local setup (not needed)
- ❌ `README_SVN_SERVER.md` - Local setup docs
- ❌ `README_TEMPLATE.md` - Template (already have README.md)
- ❌ `CREATE_CONFLICT_FOR_TESTING.md` - Testing guide (internal)
- ❌ `TEST_STEPS_*.md` - Testing steps (internal)
- ❌ `TESTING_SUMMARY.md` - Test results (internal)
- ❌ `AUTOMATED_TESTING_SETUP.md` - Setup docs (can be in README)

### Test/Development Directories
- ❌ `mock-working-copy/` - Mock test data
- ❌ `mock-svn-repo/` - Mock repository
- ❌ `svn-remote-working-copy/` - Test working copy
- ❌ `svn-remote-repo/` - Test repository
- ❌ `src-tauri/svn-working-copies/` - Test SVN copies

### Build Artifacts
- ❌ `node_modules/` - Dependencies (install via npm)
- ❌ `src-tauri/target/` - Rust build artifacts
- ❌ `frontend/dist/` - Frontend build output
- ❌ `*.exe`, `*.dmg`, `*.AppImage`, etc. - Built binaries

---

## 📋 Summary

### Keep (Essential)
- Source code (frontend/, src-tauri/)
- Configuration files (.json, .toml, .ts)
- Main documentation (README.md, LICENSE)
- GitHub files (.github/)
- Design system docs (optional but recommended)

### Exclude (Development Only)
- All `.sh` scripts
- Planning/analysis `.md` files
- Test directories
- Build artifacts
- Development notes

---

## 🎯 Quick Check

Before committing, verify:

```bash
# Check what will be committed
git status

# Should see:
# ✅ Source code files
# ✅ README.md
# ✅ LICENSE
# ✅ Configuration files
# ✅ .github/ directory

# Should NOT see:
# ❌ *.sh files
# ❌ LAUNCH_*.md files
# ❌ mock-* directories
# ❌ node_modules/
# ❌ target/
```

---

## 📝 Note

The `.gitignore` file has been updated to automatically exclude:
- All `.sh` scripts
- Planning/analysis documentation
- Test directories
- Build artifacts

**You're safe to commit!** The `.gitignore` will handle exclusions automatically.

