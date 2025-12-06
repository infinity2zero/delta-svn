# Test Cases for New Features

**Features:** Copy Files, Branch/Tag Creation, SSH Key Authentication  
**Date:** December 2024  
**Status:** Ready for Testing

---

## 1. Copy Files Operation

### Test Case 1.1: Copy Single File (Basic)
**Objective:** Verify basic file copy functionality

**Prerequisites:**
- Working copy with at least one versioned file
- User is on the Changes tab
- File is selected

**Steps:**
1. Navigate to Changes tab
2. Select a versioned file (e.g., `test.txt`)
3. Click "Copy" button in toolbar
4. Verify CopyFileModal opens
5. Verify source path is pre-filled with selected file path
6. Verify destination path is auto-suggested (e.g., `test_copy.txt`)
7. Click "Copy" button in modal
8. Wait for operation to complete

**Expected Results:**
- ✅ Modal opens with correct source path
- ✅ Destination path is auto-suggested with `_copy` suffix
- ✅ Copy operation completes successfully
- ✅ Success toast appears: "Successfully copied [source] to [destination]"
- ✅ File list refreshes showing new copied file
- ✅ Copied file appears with status "ADDED"
- ✅ Output panel shows SVN copy command and output
- ✅ Repository changes count updates

**Post-Conditions:**
- New file exists in working copy
- File is staged for commit
- Original file remains unchanged

---

### Test Case 1.2: Copy File to Different Directory
**Objective:** Verify copying file to a different directory

**Prerequisites:**
- Working copy with file structure (e.g., `folder1/file.txt`)
- User is on Changes tab

**Steps:**
1. Select file `folder1/file.txt`
2. Click "Copy" button
3. In destination field, enter `folder2/file_copy.txt`
4. Click "Copy"

**Expected Results:**
- ✅ File is copied to specified directory
- ✅ New directory structure is created if needed
- ✅ File appears in Changes list with correct path
- ✅ Success message shows full destination path

---

### Test Case 1.3: Copy File with Custom Name
**Objective:** Verify ability to customize copy name

**Steps:**
1. Select a file
2. Click "Copy" button
3. Change destination path to custom name (e.g., `my_custom_file.txt`)
4. Click "Copy"

**Expected Results:**
- ✅ File is copied with custom name
- ✅ No validation errors for valid names
- ✅ File appears with custom name in Changes list

---

### Test Case 1.4: Copy File - Validation Errors
**Objective:** Verify input validation

**Test 1.4a: Empty Destination**
- Steps: Open copy modal, clear destination field, click Copy
- Expected: Error message "Destination path cannot be empty"

**Test 1.4b: Same as Source**
- Steps: Set destination same as source path
- Expected: Error message "Source and destination paths cannot be the same"

**Test 1.4c: Invalid Path (contains ..)**
- Steps: Enter destination with ".." (e.g., `../file.txt`)
- Expected: Error message "Destination path cannot contain '..'"

---

### Test Case 1.5: Copy File - Error Handling
**Objective:** Verify error handling for various failure scenarios

**Test 1.5a: File Already Exists**
- Steps: Copy file to destination that already exists
- Expected: 
  - Error toast with SVN error message
  - Modal remains open
  - File list unchanged

**Test 1.5b: Invalid Destination Path**
- Steps: Copy to invalid path (e.g., `/absolute/path`)
- Expected:
  - Error toast with descriptive message
  - Operation fails gracefully

**Test 1.5c: No Repository Selected**
- Steps: Deselect repository, try to copy
- Expected: Toast "No repository selected" or "Please select a file to copy"

**Test 1.5d: Not on Changes Tab**
- Steps: Switch to History tab, try to copy
- Expected: Toast "Copy operation is only available on the Changes tab"

---

### Test Case 1.6: Copy File - UI/UX
**Objective:** Verify UI behavior and user experience

**Steps:**
1. Open copy modal
2. Verify modal styling matches design system
3. Verify source path is read-only (grayed out)
4. Verify destination field is focused automatically
5. Type in destination field
6. Click Cancel button
7. Re-open modal

**Expected Results:**
- ✅ Modal matches design system (rounded corners, shadows, spacing)
- ✅ Source path is visually distinct (gray background)
- ✅ Destination field is auto-focused
- ✅ Cancel button closes modal without changes
- ✅ Modal re-opens with fresh state (auto-suggested name)

---

### Test Case 1.7: Copy File - Output Panel
**Objective:** Verify command output is logged

**Steps:**
1. Open output panel
2. Copy a file
3. Check output panel

**Expected Results:**
- ✅ Output panel shows: `$ svn copy [source] [destination]`
- ✅ SVN command output is streamed in real-time
- ✅ Success/error messages appear in output
- ✅ Output is properly formatted with line breaks

---

## 2. Branch/Tag Creation

### Test Case 2.1: Create Branch from Trunk (Default)
**Objective:** Verify basic branch creation

**Prerequisites:**
- Working copy checked out from trunk
- Repository has standard structure (trunk/branches/tags)

**Steps:**
1. Click "Branch" button in toolbar
2. Verify CreateBranchTagModal opens with "Create Branch" title
3. Enter branch name: `feature/new-feature`
4. Leave source path empty
5. Click "Create Branch"

**Expected Results:**
- ✅ Modal opens with branch icon and title
- ✅ Branch name field is focused
- ✅ Source path field is optional (can be empty)
- ✅ Branch is created successfully
- ✅ Success toast: "Successfully created branch: feature/new-feature"
- ✅ Branch appears in branch list (after refresh)
- ✅ Output panel shows: `$ svn copy [source] [dest] -m "Create branch: feature/new-feature"`
- ✅ Repository list refreshes

---

### Test Case 2.2: Create Branch from Specific Source
**Objective:** Verify branch creation from custom source

**Steps:**
1. Click "Branch" button
2. Enter branch name: `hotfix/critical-fix`
3. Enter source path: `trunk`
4. Click "Create Branch"

**Expected Results:**
- ✅ Branch is created from specified source
- ✅ Branch URL is correct: `[repo]/branches/hotfix/critical-fix`
- ✅ Success message confirms creation

---

### Test Case 2.3: Create Tag from Current Working Copy
**Objective:** Verify tag creation

**Steps:**
1. Click "Tag" button in toolbar
2. Verify modal shows "Create Tag" with tag icon
3. Enter tag name: `v1.0.0`
4. Leave source path empty (uses current working copy)
5. Click "Create Tag"

**Expected Results:**
- ✅ Modal shows tag icon (BookmarkIcon)
- ✅ Tag is created successfully
- ✅ Tag appears in tags list
- ✅ Tag URL: `[repo]/tags/v1.0.0`
- ✅ Success toast: "Successfully created tag: v1.0.0"

---

### Test Case 2.4: Create Branch/Tag - Validation
**Objective:** Verify input validation

**Test 2.4a: Empty Name**
- Steps: Open modal, leave name empty, try to create
- Expected: 
  - "Create Branch/Tag" button is disabled
  - Error toast if validation bypassed: "Name cannot be empty"

**Test 2.4b: Invalid Characters**
- Steps: Enter name with invalid characters (e.g., `branch name with spaces`)
- Expected: 
  - SVN may reject or sanitize
  - Error message from SVN if invalid

**Test 2.4c: Duplicate Name**
- Steps: Create branch/tag with name that already exists
- Expected:
  - Error toast with SVN error message
  - Modal remains open
  - Existing branch/tag unchanged

---

### Test Case 2.5: Create Branch/Tag - Error Handling
**Objective:** Verify error scenarios

**Test 2.5a: No Repository Selected**
- Steps: Deselect repository, click Branch/Tag button
- Expected: Toast "No repository selected"

**Test 2.5b: Invalid Source Path**
- Steps: Enter non-existent source path
- Expected: Error toast with SVN error message

**Test 2.5c: Network Error**
- Steps: Disconnect network, try to create branch
- Expected: Error toast with network error message

**Test 2.5d: Permission Denied**
- Steps: Try to create branch without write permissions
- Expected: Error toast with permission error

---

### Test Case 2.6: Create Branch/Tag - UI/UX
**Objective:** Verify UI behavior

**Steps:**
1. Click Branch button
2. Verify modal appearance
3. Switch to Tag button
4. Verify modal updates

**Expected Results:**
- ✅ Branch modal shows CodeBracketIcon (blue)
- ✅ Tag modal shows BookmarkIcon (purple)
- ✅ Modal titles are correct ("Create Branch" vs "Create Tag")
- ✅ Source path field shows helpful placeholder
- ✅ Help text explains optional source path
- ✅ Loading state shows "Creating..." with spinner
- ✅ Buttons are disabled during creation

---

### Test Case 2.7: Create Branch/Tag - Integration with Branch Switch
**Objective:** Verify created branch appears in switch modal

**Steps:**
1. Create a new branch: `test-branch`
2. Click "Switch" button
3. Verify branch list

**Expected Results:**
- ✅ Newly created branch appears in branch list
- ✅ Branch shows correct revision
- ✅ Branch can be switched to

---

## 3. SSH Key Authentication

### Test Case 3.1: Configure SSH Key Authentication
**Objective:** Verify SSH key can be configured

**Prerequisites:**
- Valid SSH private key file exists
- SVN server supports svn+ssh:// protocol

**Steps:**
1. Navigate to Connections tab
2. Click "Connection" tab
3. Enter server URL: `svn+ssh://user@host/repo`
4. Click authentication method: "SSH Key"
5. Verify password field is hidden
6. Verify SSH key path field appears
7. Click folder icon to browse for SSH key
8. Select SSH private key file (e.g., `~/.ssh/id_rsa`)
9. Enter username
10. Click "Test Connection"
11. Click "Save"

**Expected Results:**
- ✅ Authentication method toggle works (Password ↔ SSH Key)
- ✅ UI switches between password and SSH key fields
- ✅ File browser opens when clicking folder icon
- ✅ Selected SSH key path appears in input field
- ✅ Connection test succeeds (if server is accessible)
- ✅ Connection is saved with SSH key path
- ✅ Connection appears in connection list

---

### Test Case 3.2: Test Connection with SSH Key
**Objective:** Verify connection testing with SSH key

**Steps:**
1. Configure connection with SSH key
2. Click "Test Connection" button
3. Observe connection status

**Expected Results:**
- ✅ Test button shows loading state ("Testing...")
- ✅ Connection status updates after test
- ✅ Success: Green indicator, latency shown, repository count
- ✅ Error: Red indicator with error message
- ✅ Test result card shows success/error message

---

### Test Case 3.3: Browse Remote with SSH Key
**Objective:** Verify remote browsing works with SSH authentication

**Steps:**
1. Configure connection with SSH key
2. Save connection
3. Switch to "Repo Browser" tab
4. Browse repository structure

**Expected Results:**
- ✅ Remote entries load successfully
- ✅ Directories and files are listed
- ✅ Navigation works (click directories)
- ✅ No authentication prompts
- ✅ File content can be viewed

---

### Test Case 3.4: Checkout with SSH Key
**Objective:** Verify checkout works with SSH authentication

**Steps:**
1. Configure connection with SSH key
2. Browse to a repository
3. Click "Checkout" button
4. Select destination folder
5. Complete checkout

**Expected Results:**
- ✅ Checkout operation starts
- ✅ No authentication errors
- ✅ Working copy is created successfully
- ✅ Repository appears in repository list

---

### Test Case 3.5: SSH Key - Validation
**Objective:** Verify SSH key path validation

**Test 3.5a: Empty Key Path**
- Steps: Select SSH Key auth, leave path empty, try to test
- Expected: 
  - Test may fail or use default SSH key
  - Error message if key is required

**Test 3.5b: Invalid Key Path**
- Steps: Enter non-existent file path
- Expected: 
  - Test connection may fail
  - Error message about missing key file

**Test 3.5c: Invalid Key File**
- Steps: Select a file that's not an SSH key
- Expected:
  - Connection test fails
  - Error message about invalid key format

---

### Test Case 3.6: SSH Key - Error Handling
**Objective:** Verify error scenarios

**Test 3.6a: Wrong Key for Server**
- Steps: Use SSH key that doesn't have access to server
- Expected: 
  - Connection test fails
  - Error message about authentication failure

**Test 3.6b: Key with Passphrase**
- Steps: Use SSH key protected with passphrase
- Expected:
  - May require passphrase input (if supported)
  - Or error message about passphrase-protected keys

**Test 3.6c: Server Not Accessible**
- Steps: Use invalid host in svn+ssh:// URL
- Expected:
  - Connection test fails
  - Error message about connection failure

---

### Test Case 3.7: SSH Key - Switch Between Auth Methods
**Objective:** Verify switching between password and SSH key

**Steps:**
1. Configure connection with password
2. Save connection
3. Edit connection
4. Switch to SSH Key
5. Enter SSH key path
6. Save

**Expected Results:**
- ✅ Authentication method persists in connection
- ✅ Switching methods updates UI correctly
- ✅ Saved connection retains selected auth method
- ✅ Connection works with new auth method

---

### Test Case 3.8: SSH Key - Connection Store Persistence
**Objective:** Verify SSH key is saved and loaded correctly

**Steps:**
1. Create connection with SSH key
2. Save connection
3. Close and reopen app
4. Verify connection

**Expected Results:**
- ✅ Connection is saved with SSH key path
- ✅ Connection is loaded on app restart
- ✅ Authentication method is preserved
- ✅ SSH key path is restored
- ✅ Connection still works after restart

---

### Test Case 3.9: SSH Key - Multiple Connections
**Objective:** Verify multiple connections with different auth methods

**Steps:**
1. Create Connection A with password
2. Create Connection B with SSH key
3. Switch between connections
4. Test each connection

**Expected Results:**
- ✅ Both connections are saved independently
- ✅ Each connection retains its auth method
- ✅ Switching connections loads correct credentials
- ✅ Both connections work correctly

---

### Test Case 3.10: SSH Key - UI/UX
**Objective:** Verify UI behavior

**Steps:**
1. Open connection config
2. Toggle between Password and SSH Key
3. Verify field visibility
4. Test file browser

**Expected Results:**
- ✅ Password field shows when "Password" selected
- ✅ SSH key field shows when "SSH Key" selected
- ✅ Toggle buttons have active state styling
- ✅ File browser button is visible and functional
- ✅ Help text explains svn+ssh:// URL requirement
- ✅ UI is responsive and matches design system

---

## 4. Integration Tests

### Test Case 4.1: Copy File → Commit
**Objective:** Verify copied file can be committed

**Steps:**
1. Copy a file
2. Verify file appears in Changes list
3. Stage the copied file
4. Enter commit message
5. Commit

**Expected Results:**
- ✅ Copied file is committed successfully
- ✅ File history shows copy relationship
- ✅ Commit message is saved

---

### Test Case 4.2: Create Branch → Switch to Branch
**Objective:** Verify workflow of creating and switching to branch

**Steps:**
1. Create a new branch
2. Click "Switch" button
3. Select the newly created branch
4. Verify working copy switches

**Expected Results:**
- ✅ Branch appears in switch modal immediately (after refresh)
- ✅ Can switch to newly created branch
- ✅ Working copy updates to branch content
- ✅ Repository details show new branch name

---

### Test Case 4.3: SSH Connection → Checkout → Operations
**Objective:** Verify end-to-end workflow with SSH

**Steps:**
1. Configure SSH connection
2. Browse remote repository
3. Checkout repository
4. Perform operations (add, commit, etc.)

**Expected Results:**
- ✅ All operations work with SSH authentication
- ✅ No authentication prompts
- ✅ Commands execute successfully
- ✅ Output panel shows command execution

---

## 5. Edge Cases & Error Scenarios

### Test Case 5.1: Copy File - Large Files
**Objective:** Verify copying large files

**Steps:**
1. Copy a large file (>100MB)
2. Monitor progress

**Expected Results:**
- ✅ Operation completes (may take time)
- ✅ Progress is shown in output panel
- ✅ No timeout errors
- ✅ File is copied correctly

---

### Test Case 5.2: Create Branch - Special Characters in Name
**Objective:** Verify branch names with special characters

**Steps:**
1. Try to create branch with name: `feature/test-branch_v1.0`
2. Try with: `feature/test branch` (space)
3. Try with: `feature/test@branch` (special char)

**Expected Results:**
- ✅ Valid characters work (hyphens, underscores, dots)
- ✅ Invalid characters are rejected by SVN
- ✅ Error messages are clear

---

### Test Case 5.3: SSH Key - Relative vs Absolute Paths
**Objective:** Verify path handling

**Steps:**
1. Enter relative path: `~/.ssh/id_rsa`
2. Enter absolute path: `/Users/user/.ssh/id_rsa`
3. Test both

**Expected Results:**
- ✅ Both path formats work
- ✅ Tilde expansion works (if supported)
- ✅ Absolute paths work correctly

---

### Test Case 5.4: Concurrent Operations
**Objective:** Verify handling of concurrent operations

**Steps:**
1. Start copying a file
2. While copying, try to create a branch
3. Observe behavior

**Expected Results:**
- ✅ Operations queue or one blocks the other
- ✅ No data corruption
- ✅ Error messages are clear if operation conflicts

---

## 6. Performance Tests

### Test Case 6.1: Copy Multiple Files
**Objective:** Verify performance with multiple operations

**Steps:**
1. Copy 10 files sequentially
2. Monitor performance

**Expected Results:**
- ✅ Each operation completes in reasonable time
- ✅ UI remains responsive
- ✅ No memory leaks
- ✅ Output panel handles multiple operations

---

### Test Case 6.2: List Many Branches/Tags
**Objective:** Verify performance with many branches

**Steps:**
1. Repository with 50+ branches
2. Open branch switch modal
3. Verify loading and display

**Expected Results:**
- ✅ Branches load in reasonable time
- ✅ Search/filter works smoothly
- ✅ UI remains responsive
- ✅ No performance degradation

---

## 7. Accessibility Tests

### Test Case 7.1: Keyboard Navigation
**Objective:** Verify keyboard accessibility

**Steps:**
1. Tab through copy modal fields
2. Tab through branch creation modal
3. Tab through SSH key configuration

**Expected Results:**
- ✅ All fields are keyboard accessible
- ✅ Focus indicators are visible
- ✅ Enter key submits forms
- ✅ Escape key closes modals

---

### Test Case 7.2: Screen Reader Support
**Objective:** Verify screen reader compatibility

**Steps:**
1. Enable screen reader
2. Navigate through modals
3. Verify labels and descriptions

**Expected Results:**
- ✅ All fields have proper labels
- ✅ Error messages are announced
- ✅ Button purposes are clear
- ✅ Modal purposes are announced

---

## 8. Cross-Platform Tests

### Test Case 8.1: Windows
**Objective:** Verify features work on Windows

**Focus Areas:**
- File path handling (backslashes vs forward slashes)
- SSH key path format
- Native file dialogs

---

### Test Case 8.2: macOS
**Objective:** Verify features work on macOS

**Focus Areas:**
- File path handling
- SSH key in ~/.ssh/
- Native file dialogs

---

### Test Case 8.3: Linux
**Objective:** Verify features work on Linux

**Focus Areas:**
- File path handling
- SSH key permissions
- Native file dialogs

---

## Test Execution Checklist

### Copy Files Operation
- [ ] Test Case 1.1: Copy Single File (Basic)
- [ ] Test Case 1.2: Copy File to Different Directory
- [ ] Test Case 1.3: Copy File with Custom Name
- [ ] Test Case 1.4: Copy File - Validation Errors
- [ ] Test Case 1.5: Copy File - Error Handling
- [ ] Test Case 1.6: Copy File - UI/UX
- [ ] Test Case 1.7: Copy File - Output Panel

### Branch/Tag Creation
- [ ] Test Case 2.1: Create Branch from Trunk (Default)
- [ ] Test Case 2.2: Create Branch from Specific Source
- [ ] Test Case 2.3: Create Tag from Current Working Copy
- [ ] Test Case 2.4: Create Branch/Tag - Validation
- [ ] Test Case 2.5: Create Branch/Tag - Error Handling
- [ ] Test Case 2.6: Create Branch/Tag - UI/UX
- [ ] Test Case 2.7: Create Branch/Tag - Integration with Branch Switch

### SSH Key Authentication
- [ ] Test Case 3.1: Configure SSH Key Authentication
- [ ] Test Case 3.2: Test Connection with SSH Key
- [ ] Test Case 3.3: Browse Remote with SSH Key
- [ ] Test Case 3.4: Checkout with SSH Key
- [ ] Test Case 3.5: SSH Key - Validation
- [ ] Test Case 3.6: SSH Key - Error Handling
- [ ] Test Case 3.7: SSH Key - Switch Between Auth Methods
- [ ] Test Case 3.8: SSH Key - Connection Store Persistence
- [ ] Test Case 3.9: SSH Key - Multiple Connections
- [ ] Test Case 3.10: SSH Key - UI/UX

### Integration Tests
- [ ] Test Case 4.1: Copy File → Commit
- [ ] Test Case 4.2: Create Branch → Switch to Branch
- [ ] Test Case 4.3: SSH Connection → Checkout → Operations

### Edge Cases
- [ ] Test Case 5.1: Copy File - Large Files
- [ ] Test Case 5.2: Create Branch - Special Characters
- [ ] Test Case 5.3: SSH Key - Relative vs Absolute Paths
- [ ] Test Case 5.4: Concurrent Operations

### Performance Tests
- [ ] Test Case 6.1: Copy Multiple Files
- [ ] Test Case 6.2: List Many Branches/Tags

### Accessibility Tests
- [ ] Test Case 7.1: Keyboard Navigation
- [ ] Test Case 7.2: Screen Reader Support

### Cross-Platform Tests
- [ ] Test Case 8.1: Windows
- [ ] Test Case 8.2: macOS
- [ ] Test Case 8.3: Linux

---

## Test Data Requirements

### For Copy Files Testing:
- Working copy with various file types (text, binary, large files)
- Files in different directories
- Files with special characters in names

### For Branch/Tag Creation Testing:
- Repository with standard structure (trunk/branches/tags)
- Repository with existing branches/tags
- Repository with write permissions

### For SSH Key Testing:
- Valid SSH private key file
- SVN server accessible via svn+ssh://
- Server with proper SSH configuration
- Test server or local SVN server with SSH

---

## Known Limitations

1. **SSH Key Passphrase:** Currently, passphrase-protected SSH keys may require manual entry or SSH agent
2. **SSH Config:** Advanced SSH configuration (via ~/.ssh/config) may not be fully supported
3. **Large Repositories:** Performance may vary with very large repositories (1000+ branches)

---

## Notes

- All test cases assume a properly configured SVN environment
- Some tests require specific server configurations
- Network connectivity is required for remote operations
- Test data should be cleaned up after testing to avoid conflicts

---

**Last Updated:** December 2024  
**Test Coverage:** Copy Files (7 cases), Branch/Tag Creation (7 cases), SSH Key Auth (10 cases), Integration (3 cases), Edge Cases (4 cases), Performance (2 cases), Accessibility (2 cases), Cross-Platform (3 cases)  
**Total Test Cases:** 38

