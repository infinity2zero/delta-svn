# DELTA SVN

**Track Every Change**

A modern, cross-platform SVN client built with Tauri + React, designed to be a sophisticated replacement for TortoiseSVN with enhanced features and a beautiful native-like UI.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/yourusername/delta-svn/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/yourusername/delta-svn/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/yourusername/delta-svn/releases)

---

## ✨ Features

### Core SVN Operations
- ✅ **Update** - Update working copy to latest revision
- ✅ **Commit** - Commit changes with message and file staging
- ✅ **Revert** - Revert changes to files
- ✅ **Status** - Real-time file status detection (Modified, Added, Deleted, etc.)
- ✅ **Diff** - View file differences (side-by-side and unified views)
- ✅ **History** - Browse commit history with filtering, search, and detailed information
- ✅ **Blame/Annotate** - View file blame annotations showing who changed what and when
- ✅ **Compare Revisions** - Compare any two revisions side-by-side
- ✅ **Export** - Export files from specific revisions
- ✅ **Merge** - Merge revisions (basic implementation)

### File Operations
- ✅ **Add Files** - Add unversioned files to version control
- ✅ **Delete Files** - Remove files from version control with confirmation
- ✅ **Move/Rename** - Move or rename files while preserving history
- ✅ **Copy Files** - Copy files in repository while preserving history
- ✅ **Multi-selection** - Select and operate on multiple files at once

### Repository Management
- ✅ **Multiple Repositories** - Manage multiple working copies simultaneously
- ✅ **Remote Browser** - Browse remote SVN repositories
- ✅ **Checkout** - Checkout repositories from remote servers
- ✅ **Connection Management** - Save and manage SVN server connections with credentials
- ✅ **SSH Key Authentication** - Support for SSH key-based authentication (svn+ssh://)
- ✅ **Repository Details** - View comprehensive repository information (revision, branch, path, statistics)
- ✅ **Repository Selection** - Switch between repositories with radio button selection
- ✅ **Branch Switching** - Switch working copy to different branches or tags with visual selector
- ✅ **Branch/Tag Creation** - Create new branches and tags from the UI

### User Experience
- ✅ **Modern UI** - Beautiful, native-like interface with consistent design system
- ✅ **Dark/Light Theme** - Seamless theme switching with system preference detection
- ✅ **Resizable Panels** - Fully customizable layout with drag-to-resize panels
- ✅ **Keyboard Shortcuts** - Efficient workflow with keyboard navigation
- ✅ **Context Menus** - Right-click actions throughout the interface
- ✅ **Real-time Updates** - Live status updates and command output streaming
- ✅ **Toast Notifications** - User-friendly feedback for all operations
- ✅ **Output Panel** - Real-time command output and logging
- ✅ **Onboarding** - Interactive welcome screen for first-time users
- ✅ **User Guide** - Comprehensive in-app documentation and SVN commands tutorial

### Platform Support
- ✅ **Windows** - Full support for Windows 10+
- ✅ **macOS** - Native macOS app (Intel + Apple Silicon)
- ✅ **Linux** - AppImage, DEB, and RPM packages

---

## 📸 Screenshots

> **Note:** Screenshots will be added soon. Check back for visual previews of the interface.

### Planned Screenshots
- Main Interface
- Changes View with file operations
- History View with commit details
- Diff Viewer (side-by-side and unified)
- Dark Theme
- Onboarding Screen
- User Guide

---

## 🚀 Installation

### Download

Download the latest release for your platform:

- **Windows:** [Download MSI Installer](https://github.com/yourusername/delta-svn/releases/latest/download/delta-svn_0.1.0_x64_en-US.msi)
- **macOS:** [Download DMG](https://github.com/yourusername/delta-svn/releases/latest/download/delta-svn_0.1.0_x64.dmg) (Intel + Apple Silicon)
- **Linux:** 
  - [AppImage](https://github.com/yourusername/delta-svn/releases/latest/download/delta-svn_0.1.0_amd64.AppImage)
  - [DEB Package](https://github.com/yourusername/delta-svn/releases/latest/download/delta-svn_0.1.0_amd64.deb)
  - [RPM Package](https://github.com/yourusername/delta-svn/releases/latest/download/delta-svn_0.1.0_amd64.rpm)

### System Requirements

- **Windows:** Windows 10 or later
- **macOS:** macOS 10.15 (Catalina) or later
- **Linux:** glibc 2.31 or later

---

## 🏃 Quick Start

### 1. First Launch

When you first open DELTA SVN, you'll see an interactive onboarding screen that guides you through:
- Adding your first repository
- Understanding the interface
- Performing your first operations
- Connecting to SVN servers

You can skip the onboarding and access it later from Settings.

### 2. Add a Repository

**Option A: Add Existing Working Copy**
1. Go to the **Repositories** tab
2. Click **Add Repository**
3. Select your local working copy directory
4. The repository will appear in your list

**Option B: Checkout from Remote**
1. Go to the **Connections** tab
2. Add your SVN server connection (URL, username, password)
3. Browse the remote repository structure
4. Select the path you want to checkout
5. Click **Checkout** and choose a local directory

### 3. View Changes

1. Select a repository from the list (or use the radio button to make it active)
2. Go to the **Changes** tab
3. View all modified, added, and deleted files
4. Click any file to see its diff

### 4. File Operations

**Add Files:**
- Select unversioned files (marked with `?`)
- Click the **Add** button in the toolbar

**Delete Files:**
- Select files you want to delete
- Click the **Delete** button
- Confirm the deletion in the dialog

**Move/Rename:**
- Select a file
- Click the **Move** button
- Enter the new name or path
- Confirm the operation

### 5. Commit Changes

1. Select files you want to commit (use checkboxes)
2. Enter a commit message in the commit panel
3. Click **Commit**
4. Your changes will be committed to the repository

### 6. Update Working Copy

1. Select your repository
2. Click the **Update** button in the toolbar
3. Your working copy will be updated to the latest revision

### 7. View History

1. Go to the **History** tab
2. Browse commit history with filtering options
3. Click any commit to see changed files
4. Click any file to view its diff at that revision
5. Use the compare feature to see differences between revisions

---

## 📚 Documentation

### In-App Documentation

- **User Guide** - Access from Help menu or Settings
  - Getting Started guide
  - Features overview
  - Complete SVN Commands Tutorial
  - Troubleshooting guide

### External Documentation

- [User Guide](docs/USER_GUIDE.md) - Comprehensive user documentation (coming soon)
- [Developer Guide](docs/DEVELOPER_GUIDE.md) - Setup and development instructions (coming soon)
- [API Documentation](docs/API.md) - Tauri command reference (coming soon)

---

## 🛠️ Development

### Prerequisites

- **Node.js** 18+ 
- **Rust** (latest stable version)
- **System SVN** (for development - optional, app will bundle SVN binaries in production)

### Setup

   ```bash
# Clone the repository
git clone https://github.com/yourusername/delta-svn.git
cd delta-svn

# Install frontend dependencies
   cd frontend
   npm install

# Return to root
cd ..

# Run development server
   npm run tauri:dev
   ```

Or run frontend and Tauri separately:

   ```bash
   # Terminal 1: Frontend dev server
   cd frontend
   npm run dev

# Terminal 2: Tauri dev (from project root)
   cargo tauri dev
   ```

### Build

```bash
# Build for current platform
npm run tauri:build

# Build for specific platform (requires cross-compilation setup)
cargo tauri build --target x86_64-pc-windows-msvc  # Windows
cargo tauri build --target x86_64-apple-darwin     # macOS Intel
cargo tauri build --target aarch64-apple-darwin    # macOS Apple Silicon
cargo tauri build --target x86_64-unknown-linux-gnu # Linux
```

### Project Structure

```
delta-svn/
├── frontend/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── changes/  # Changes view, commit panel
│   │   │   ├── connections/ # Remote browser, connection config
│   │   │   ├── diff/     # Diff viewer, blame viewer
│   │   │   ├── help/     # User guide screen
│   │   │   ├── layout/   # Toolbar, titlebar, navigation
│   │   │   ├── onboarding/ # Onboarding screen
│   │   │   ├── repositories/ # Repository list and details
│   │   │   └── ui/       # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── store/        # State management (Zustand)
│   │   └── App.tsx       # Main app component
│   └── package.json
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── main.rs       # Tauri entry point
│   │   ├── svn.rs        # SVN command implementations
│   │   └── storage.rs    # Local storage management
│   ├── Cargo.toml
│   └── tauri.conf.json   # Tauri configuration
├── Design System/        # Design system documentation
│   ├── design-system-guide.md
│   └── design-tokens.css
├── .github/              # GitHub Actions workflows
│   └── workflows/
│       ├── build.yml     # Cross-platform builds
│       └── release.yml   # Automated releases
└── README.md
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Reporting Issues

Found a bug or have a feature request? Please open an issue using our templates:
- [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)

### Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

## 🗺️ Roadmap

### ✅ Completed (v0.1.0)

- Core SVN operations (Update, Commit, Revert, Diff, History, Blame)
- File operations (Add, Delete, Move/Rename, Copy)
- Repository management (multiple repos, remote browser, checkout)
- Conflict resolution UI (3-way merge with accept theirs/mine/working)
- Branch/Tag management (switch, create branches and tags)
- SSH key authentication support
- Modern UI with dark/light themes
- Onboarding screen
- In-app user guide
- Cross-platform support

### 🚧 In Progress

- Performance optimizations
- Advanced merge conflict resolution

### 📅 Upcoming Features
- [ ] **SSH Key Support** - SSH key authentication for SVN servers
- [ ] **Stash/Unstash** - Save and restore uncommitted changes
- [ ] **Properties Management** - SVN properties editor
- [ ] **Externals** - SVN externals handling
- [ ] **File Watching** - Auto-refresh on file system changes
- [ ] **Advanced Search** - Search within files, regex support
- [ ] **Multi-language Support** - Internationalization (i18n)
- [ ] **Issue Integration** - Link to Jira, GitHub Issues, etc.

See [LAUNCH_ANALYSIS_AND_PLAN.md](LAUNCH_ANALYSIS_AND_PLAN.md) for the complete roadmap and detailed feature list.

---

## 🐛 Known Issues

- Advanced merge conflict resolution features (currently supports basic accept theirs/mine/working)

For a complete list of known issues, see [GitHub Issues](https://github.com/yourusername/delta-svn/issues).

---

## 💬 Support

- **Documentation:** Access the in-app User Guide (Help menu)
- **Issues:** [GitHub Issues](https://github.com/yourusername/delta-svn/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/delta-svn/discussions)

---

## 🧪 Testing

### Test Steps for File Operations

See [TEST_STEPS_FILE_OPERATIONS.md](TEST_STEPS_FILE_OPERATIONS.md) for detailed testing procedures for:
- Add files
- Delete files
- Move/Rename files
- Error handling
- Edge cases

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/) - Build smaller, faster, and more secure desktop applications
- UI components from [Heroicons](https://heroicons.com/) - Beautiful hand-crafted SVG icons
- Styling with [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- State management with [Zustand](https://github.com/pmndrs/zustand) - Lightweight state management
- Data fetching with [TanStack Query](https://tanstack.com/query) - Powerful data synchronization
- Inspired by modern Git clients like [GitButler](https://gitbutler.com/) and [GitHub Desktop](https://desktop.github.com/)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/delta-svn&type=Date)](https://star-history.com/#yourusername/delta-svn&Date)

---

## 📊 Project Status

**Current Version:** 0.1.0  
**Status:** Pre-Launch (Beta)  
**Readiness:** ~75% Ready for Launch

### What's Working
- ✅ All core SVN operations
- ✅ File operations (Add, Delete, Move/Rename)
- ✅ Repository management
- ✅ Modern UI with themes
- ✅ Onboarding and user guide

### What's Next
- 🚧 Conflict resolution UI
- 🚧 Branch switching
- 📝 Final documentation polish
- 🧪 Cross-platform testing

---

**Made with ❤️ by the DELTA SVN team**

*Track Every Change*
