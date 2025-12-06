use crate::storage;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};
use regex;

#[derive(Serialize)]
pub struct RepositorySummary {
    pub name: String,
    pub url: String,
    pub path: String,
    pub revision: String,
    pub branch: String,
    pub changes: usize,
    pub status: String,
}

#[derive(Serialize)]
pub struct FileChangeEntry {
    pub name: String,
    pub status: String,
    pub revision: String,
    pub author: String,
}

#[derive(Serialize)]
pub struct RemoteEntry {
    pub name: String,
    pub kind: String,
}

#[derive(Serialize, Clone)]
pub struct CommitLogEntry {
    pub revision: String,
    pub author: String,
    pub date: String,
    pub message: String,
    pub changed_paths: Vec<ChangedPath>,
    pub stats: CommitStats,
    pub branch: String, // Inferred from changed paths
}

#[derive(Serialize, Clone)]
pub struct CommitStats {
    pub added: usize,
    pub modified: usize,
    pub deleted: usize,
    pub replaced: usize,
}

#[derive(Serialize, Clone)]
pub struct ChangedPath {
    pub path: String,
    pub action: String, // "A" = added, "M" = modified, "D" = deleted, "R" = replaced
    pub copyfrom_path: Option<String>, // Path this was copied from (if action is "A" or "R")
    pub copyfrom_rev: Option<String>, // Revision this was copied from
}

#[tauri::command]
pub async fn list_repositories(app: AppHandle) -> Result<Vec<RepositorySummary>, String> {
    let working_copies = storage::load_working_copies(&app)?;
    
    let mut repositories = Vec::new();
    
    for wc in working_copies {
        let path = PathBuf::from(&wc.path);
        if !path.exists() {
            continue; // Skip non-existent working copies
        }
        
        match get_repository_info(&path).await {
            Ok(info) => repositories.push(RepositorySummary {
                name: wc.name,
                url: wc.url,
                path: wc.path,
                revision: info.revision,
                branch: info.branch,
                changes: info.changes,
                status: "synced".into(),
            }),
            Err(_) => {
                // If we can't get info, still add it but mark as error
                repositories.push(RepositorySummary {
                    name: wc.name,
                    url: wc.url,
                    path: wc.path,
                    revision: "?".into(),
                    branch: "?".into(),
                    changes: 0,
                    status: "error".into(),
                });
            }
        }
    }
    
    Ok(repositories)
}

#[tauri::command]
pub async fn get_svn_status(working_copy_path: String) -> Result<Vec<FileChangeEntry>, String> {
    let path = PathBuf::from(working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }
    // Use --show-updates to get the most current status, including added files
    let output = run_svn(&["status", "--no-ignore"], Some(&path)).await?;
    Ok(parse_status_output(&output))
}

#[tauri::command]
pub async fn get_file_diff(working_copy_path: String, file_path: String) -> Result<String, String> {
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    let full_path = working_copy.join(&file_path);
    if !full_path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    // Run svn diff for the specific file
    let output = run_svn(&["diff", &file_path], Some(&working_copy)).await?;
    Ok(output)
}

#[tauri::command]
pub async fn get_file_content(working_copy_path: String, file_path: String) -> Result<String, String> {
    use std::fs;
    
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    let full_path = working_copy.join(&file_path);
    if !full_path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    // Read file content
    let content = fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    Ok(content)
}

#[tauri::command]
pub async fn get_file_content_at_revision(
    working_copy_path: String,
    file_path: String,
    revision: String,
) -> Result<String, String> {
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Get repository root URL
    let info_output = run_svn(&["info", "--show-item", "repos-root-url"], Some(&working_copy)).await?;
    let repo_root_url = info_output.trim();
    
    // Construct the full repository URL for the file
    let file_url = if file_path.starts_with('/') {
        format!("{}{}", repo_root_url, file_path)
    } else {
        format!("{}/{}", repo_root_url, file_path)
    };

    // Get file content using svn cat at specific revision
    let content = run_svn(
        &["cat", "-r", &revision, &file_url],
        Some(&working_copy),
    ).await?;
    
    Ok(content)
}

#[tauri::command]
pub async fn get_revision_diff(
    working_copy_path: String,
    file_path: String,
    revision: String,
) -> Result<String, String> {
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Calculate previous revision
    let rev_num: i32 = revision.parse().map_err(|_| "Invalid revision number")?;
    let prev_rev = if rev_num > 1 {
        format!("{}", rev_num - 1)
    } else {
        "0".to_string()
    };

    // Get repository root URL to construct full repository path
    // The file_path from commit history is repository-relative (e.g., "trunk/file.txt")
    // We need to get the repository root URL and append the file path
    let info_output = run_svn(&["info", "--show-item", "repos-root-url"], Some(&working_copy)).await?;
    let repo_root_url = info_output.trim();
    
    // Construct the full repository URL for the file
    let file_url = if file_path.starts_with('/') {
        format!("{}{}", repo_root_url, file_path)
    } else {
        format!("{}/{}", repo_root_url, file_path)
    };

    // Run svn diff -r PREV:REV using the repository URL
    // This works for all files including deleted ones
    let output = run_svn(
        &["diff", "-r", &format!("{}:{}", prev_rev, revision), &file_url],
        Some(&working_copy),
    )
    .await?;
    Ok(output)
}

#[tauri::command]
pub async fn register_working_copy(
    app: AppHandle,
    path: String,
    url: String,
    name: String,
) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    
    // Verify it's a valid SVN working copy
    if !path_buf.exists() {
        return Err("Path does not exist".into());
    }
    
    // Check if .svn directory exists
    if !path_buf.join(".svn").exists() {
        return Err("Path is not a valid SVN working copy (no .svn directory)".into());
    }
    
    let working_copy = storage::WorkingCopy {
        path: path.clone(),
        url,
        name: if name.is_empty() {
            path_buf
                .file_name()
                .map(|os| os.to_string_lossy().to_string())
                .unwrap_or_else(|| "working-copy".into())
        } else {
            name
        },
    };
    
    storage::add_working_copy(&app, working_copy)
}

#[tauri::command]
pub async fn checkout_remote(
    app: AppHandle,
    remote_url: String,
    destination: String,
    username: String,
    password: String,
) -> Result<String, String> {
    let dest_path = PathBuf::from(&destination);
    if dest_path.exists() {
        // Check if it's already a registered working copy
        let working_copies = storage::load_working_copies(&app).unwrap_or_default();
        let is_registered = working_copies.iter().any(|wc| wc.path == destination);
        
        if is_registered {
            return Err(format!(
                "Working copy already exists and is registered: {}\n\nRemove it from the Repositories list first, or choose a different destination path.",
                destination
            ));
        } else {
            return Err(format!(
                "Destination path already exists: {}\n\nPlease choose a different destination path, or remove the existing folder first.",
                destination
            ));
        }
    }
    
    if let Some(parent) = dest_path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let args = vec!["checkout".into(), remote_url.clone(), destination.clone()];
    run_svn_with_credentials(args, &username, &password, None).await?;
    
    // Automatically register the checked-out working copy
    let name = dest_path
        .file_name()
        .map(|os| os.to_string_lossy().to_string())
        .unwrap_or_else(|| "working-copy".into());
    
    if let Err(e) = register_working_copy(app.clone(), destination.clone(), remote_url, name).await {
        // Log error but don't fail the checkout
        eprintln!("Warning: Failed to register working copy: {}", e);
    }
    
    Ok(destination)
}

#[tauri::command]
pub async fn unregister_working_copy(app: AppHandle, path: String) -> Result<(), String> {
    storage::remove_working_copy(&app, &path)
}

#[derive(Serialize)]
pub struct UpdateResult {
    pub updated_to_revision: String,
    pub files_updated: usize,
    pub conflicts: usize,
    pub output: String,
}

#[tauri::command]
pub async fn update_working_copy(working_copy_path: String) -> Result<UpdateResult, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Run svn update
    let output = run_svn(&["update"], Some(&path)).await?;

    // Parse the output to extract revision and file information
    let mut updated_to_revision = String::new();
    let mut files_updated = 0;
    let mut conflicts = 0;

    for line in output.lines() {
        // Look for revision info: "Updated to revision X."
        if line.contains("Updated to revision") {
            if let Some(rev) = line.split_whitespace().nth(3) {
                updated_to_revision = rev.trim_end_matches('.').to_string();
            }
        }
        // Count files updated (lines starting with action codes: A, D, U, G, C, E)
        if let Some(first_char) = line.chars().next() {
            match first_char {
                'A' | 'D' | 'U' | 'G' | 'E' => files_updated += 1,
                'C' => {
                    files_updated += 1;
                    conflicts += 1;
                }
                _ => {}
            }
        }
    }

    Ok(UpdateResult {
        updated_to_revision: if updated_to_revision.is_empty() {
            "unchanged".into()
        } else {
            updated_to_revision
        },
        files_updated,
        conflicts,
        output,
    })
}

#[derive(Serialize)]
pub struct CommitResult {
    pub revision: String,
    pub files_committed: usize,
    pub output: String,
}

#[tauri::command]
pub async fn commit_working_copy(
    app: AppHandle,
    working_copy_path: String,
    files: Vec<String>,
    message: String,
    username: Option<String>,
    password: Option<String>,
) -> Result<CommitResult, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    if message.trim().is_empty() {
        return Err("Commit message is required".into());
    }

    if files.is_empty() {
        return Err("No files selected for commit".into());
    }

    // Use provided credentials, or try without (SVN might have cached credentials)
    let commit_username = username;
    let commit_password = password;

    // Get repository URL to check if it's remote and for debugging
    let mut repo_url = String::new();
    let mut repo_root_url = String::new();
    if let Ok(info_output) = run_svn(&["info"], Some(&path)).await {
        for line in info_output.lines() {
            if let Some(value) = line.strip_prefix("URL:") {
                repo_url = value.trim().to_string();
            } else if let Some(value) = line.strip_prefix("Repository Root:") {
                repo_root_url = value.trim().to_string();
            }
        }
    }

    // Check for unversioned files in the commit list - user must add them first
    let status_output = run_svn(&["status"], Some(&path)).await?;
    let mut unversioned_files: Vec<String> = Vec::new();
    
    for line in status_output.lines() {
        if line.is_empty() {
            continue;
        }
        // SVN status format: first character indicates status
        // '?' = unversioned, 'A' = added, 'M' = modified, 'D' = deleted
        let status_char = line.chars().next().unwrap_or(' ');
        let file_path = line[1..].trim_start().to_string();
        
        // If file is unversioned and in our commit list, user needs to add it first
        if status_char == '?' && files.contains(&file_path) {
            unversioned_files.push(file_path.clone());
        }
    }
    
    // Prompt user to add unversioned files first
    if !unversioned_files.is_empty() {
        let file_list = unversioned_files.iter().take(5).map(|f| format!("  - {}", f)).collect::<Vec<_>>().join("\n");
        let more_count = if unversioned_files.len() > 5 {
            format!("\n  ... and {} more", unversioned_files.len() - 5)
        } else {
            String::new()
        };
        
        return Err(format!(
            "Cannot commit unversioned files. Please add them to SVN first.\n\n\
            Unversioned files in commit list:\n{}{}\n\n\
            To add files:\n\
            1. Select the unversioned files in the Changes view\n\
            2. Click the 'Add' button in the toolbar\n\
            3. Then commit the files",
            file_list, more_count
        ));
    }
    
    // Get status to check which files are deleted
    let status_output_for_deleted = run_svn(&["status"], Some(&path)).await?;
    let mut deleted_files: Vec<String> = Vec::new();
    
    for line in status_output_for_deleted.lines() {
        if line.is_empty() {
            continue;
        }
        let status_char = line.chars().next().unwrap_or(' ');
        let file_path = line[1..].trim_start().to_string();
        
        if status_char == 'D' && files.contains(&file_path) {
            deleted_files.push(file_path.clone());
        }
    }
    
    // Filter out invalid file paths (like "> moved to" display labels)
    let valid_files: Vec<String> = files
        .iter()
        .filter(|file| {
            // Filter out display-only entries that start with "> " or contain "moved to"/"moved from"
            !file.trim_start().starts_with("> ") && 
            !file.contains("moved to") && 
            !file.contains("moved from")
        })
        .cloned()
        .collect();
    
    if valid_files.is_empty() {
        return Err("No valid files to commit after filtering".into());
    }
    
    // Validate all files are within the working copy and normalize paths
    let mut normalized_files: Vec<String> = Vec::new();
    for file in &valid_files {
        let file_path = PathBuf::from(file);
        let full_path = if file_path.is_absolute() {
            file_path.clone()
        } else {
            path.join(&file_path)
        };
        
        // Check if file exists - skip this check for deleted files
        let is_deleted = deleted_files.contains(file);
        if !full_path.exists() && !is_deleted {
            return Err(format!("File does not exist: {}", file));
        }
        
        // Ensure file is within working copy (check parent directory for deleted files)
        if is_deleted {
            // For deleted files, check if parent directory exists and is within working copy
            if let Some(parent) = full_path.parent() {
                if !parent.exists() || !parent.starts_with(&path) {
                    return Err(format!("File {} is outside the working copy at {}", file, path.display()));
                }
            }
        } else {
            if !full_path.starts_with(&path) {
                return Err(format!("File {} is outside the working copy at {}", file, path.display()));
            }
        }
        
        // Convert to relative path for SVN command
        if let Ok(relative) = full_path.strip_prefix(&path) {
            normalized_files.push(relative.to_string_lossy().replace('\\', "/"));
        } else {
            // This shouldn't happen if starts_with check passed, but handle it
            normalized_files.push(file.clone());
        }
    }
    
    // Check SVN status to find parent directories that are added and moved files
    // SVN requires parent directories to be committed before their children
    // SVN also requires both sides of a move to be committed together
    let status_output = run_svn(&["status"], Some(&path)).await?;
    let mut added_directories: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut moved_files: std::collections::HashMap<String, String> = std::collections::HashMap::new(); // destination -> source
    
    for line in status_output.lines() {
        if line.is_empty() {
            continue;
        }
        let status_char = line.chars().next().unwrap_or(' ');
        let file_path = line[1..].trim_start().to_string();
        
        // Check for moved files - SVN shows 'A' (added) for destination and 'D' (deleted) for source
        // Or 'R' (replaced) if it's a move within the same commit
        // We need to find pairs: if a file is 'A' and another is 'D' with same name pattern, it's a move
        if status_char == 'A' {
            // Normalize path (remove trailing slash)
            let normalized_path = file_path.trim_end_matches('/').to_string();
            // Check if this path is a parent of any file we're committing
            for file in &normalized_files {
                if file.starts_with(&format!("{}/", normalized_path)) {
                    added_directories.insert(normalized_path.clone());
                }
            }
        }
    }
    
    // Second pass: Find moved file pairs
    // SVN status shows: 'A' (added) for destination, 'D' (deleted) for source
    // Parse status lines to find moved files
    let status_lines: Vec<(char, String)> = status_output
        .lines()
        .filter_map(|line| {
            if line.trim().is_empty() {
                return None;
            }
            let status_char = line.chars().next()?;
            let file_path = line[1..].trim_start().to_string();
            Some((status_char, file_path))
        })
        .collect();
    
    // Find moved file pairs: 'A' (destination) and 'D' (source)
    // When SVN moves a file, it marks source as 'D' and destination as 'A'
    // Strategy: For each 'A' file in commit list, find corresponding 'D' file
    for (dest_status, dest_path) in &status_lines {
        if *dest_status == 'A' && normalized_files.contains(dest_path) {
            // This is a destination of a potential move
            // Look for corresponding 'D' (deleted) source
            // Try to match by filename first (most common case for renames)
            let dest_filename = dest_path.split('/').last().unwrap_or("");
            
            for (src_status, src_path) in &status_lines {
                if *src_status == 'D' {
                    let src_filename = src_path.split('/').last().unwrap_or("");
                    
                    // Match criteria (in order of confidence):
                    // 1. Source is explicitly in valid_files list - definitely a move
                    if valid_files.contains(src_path) {
                        moved_files.insert(dest_path.clone(), src_path.clone());
                        break;
                    }
                    // 2. Same filename, different path - likely a move/rename
                    else if src_filename == dest_filename && src_path != dest_path {
                        // Additional check: ensure they're in the same directory structure
                        // (for renames) or related paths (for moves)
                        let _dest_parent = dest_path.rsplitn(2, '/').nth(1).unwrap_or("");
                        let _src_parent = src_path.rsplitn(2, '/').nth(1).unwrap_or("");
                        
                        // Same parent = rename, different parent = move
                        // Both are valid moves
                        moved_files.insert(dest_path.clone(), src_path.clone());
                        break;
                    }
                }
            }
        }
    }
    
    // Also check for 'R' (replaced) status which indicates a move/rename
    for (status_char, file_path) in &status_lines {
        if *status_char == 'R' && normalized_files.contains(file_path) {
            // Replaced files are moves - need to find the source
            // Look for 'D' files that could be the source
            let dest_filename = file_path.split('/').last().unwrap_or("");
            for (src_status, src_path) in &status_lines {
                if *src_status == 'D' {
                    let src_filename = src_path.split('/').last().unwrap_or("");
                    // If same filename or source is in valid_files list, it's likely the source
                    if valid_files.contains(src_path) || (src_filename == dest_filename && src_path != file_path) {
                        moved_files.insert(file_path.clone(), src_path.clone());
                        break;
                    }
                }
            }
        }
    }
    
    // Add moved file sources to the commit list
    // SVN requires both source and destination of a move to be committed together
    let mut moved_sources: Vec<String> = Vec::new();
    for (dest, src) in &moved_files {
        // Normalize source path to match normalized_files format
        let src_path = PathBuf::from(src);
        let full_src = if src_path.is_absolute() {
            src_path.clone()
        } else {
            path.join(&src_path)
        };
        let normalized_src = full_src.strip_prefix(&path)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| src.clone());
        
        // Filter out invalid paths (shouldn't happen, but be safe)
        if normalized_src.starts_with("> ") || normalized_src.contains("moved to") || normalized_src.contains("moved from") {
            eprintln!("Warning: Skipping invalid moved source path: {}", normalized_src);
            continue;
        }
        
        if !normalized_files.contains(&normalized_src) {
            // Source is not in commit list, add it
            moved_sources.push(normalized_src.clone());
            eprintln!("Adding moved file source to commit: {} (destination: {})", normalized_src, dest);
            app.emit("svn-output", &format!("Note: Including moved file source: {} (destination: {})\n", normalized_src, dest)).ok();
        }
    }
    
    // Log detected moves for debugging
    if !moved_files.is_empty() {
        eprintln!("Detected {} moved file pair(s):", moved_files.len());
        for (dest, src) in &moved_files {
            eprintln!("  Move: {} -> {}", src, dest);
        }
    }
    
    // Add parent directories to the commit list (before their children)
    // This ensures SVN commits directories before files inside them
    let mut files_with_parents: Vec<String> = Vec::new();
    for dir in &added_directories {
        files_with_parents.push(dir.clone());
    }
    // Add moved sources first (they need to be committed with destinations)
    files_with_parents.extend_from_slice(&moved_sources);
    // Add the original files
    files_with_parents.extend_from_slice(&normalized_files);
    // Remove duplicates while preserving order (directories first, then moved sources, then files)
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    normalized_files.clear();
    for file in files_with_parents {
        if !seen.contains(&file) {
            seen.insert(file.clone());
            normalized_files.push(file);
        }
    }
    
    // Build commit command: svn commit [files...] -m "message"
    let mut command = Command::new("svn");
    command.arg("commit");
    
    // Add normalized files to commit
    for file in &normalized_files {
        command.arg(file);
    }
    
    // Add commit message
    command.arg("-m");
    command.arg(&message);
    
    // Add credentials if provided
    // Note: SVN requires both username and password if one is provided
    if let Some(u) = &commit_username {
        command.arg("--username");
        command.arg(u);
        // If password is provided, use it; otherwise SVN will try cached credentials
        if let Some(p) = &commit_password {
            command.arg("--password");
            command.arg(p);
        }
    }
    // Note: If only password is provided without username, we skip it
    // SVN will try to use cached credentials in that case
    
    command.current_dir(&path);
    command.arg("--non-interactive");
    command.arg("--trust-server-cert");
    
    // Debug: Log what we're doing (without logging password)
    eprintln!("Committing to: {}", repo_url);
    eprintln!("Repository root: {}", repo_root_url);
    eprintln!("Working copy path: {}", path.display());
    eprintln!("Using username: {}", commit_username.as_deref().unwrap_or("(none - using cached)"));
    eprintln!("Has password: {}", commit_password.is_some());
    eprintln!("Files to commit: {:?}", files);
    
    // If we have credentials but repo_root_url doesn't match, warn
    if !repo_root_url.is_empty() && commit_username.is_some() {
        eprintln!("Note: Ensure connection URL matches repository root: {}", repo_root_url);
    }
    
    // Add timeout to prevent hanging
    // Note: tokio::process::Command doesn't have built-in timeout,
    // but we can add it via tokio::time::timeout if needed
    
    // Log the full command (without password) for debugging
    eprintln!("Executing: svn commit [files] -m [message] --username [user] --password [***] --non-interactive --trust-server-cert");
    
    // Emit command being executed
    let cmd_str = format!("svn commit {} -m \"{}\"", normalized_files.join(" "), message);
    app.emit("svn-output", &format!("$ {}\n", cmd_str)).ok();
    
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());
    
    let mut child = command.spawn().map_err(|err| err.to_string())?;

    // Stream stdout in real-time
    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                app_clone.emit("svn-output", &format!("{}\n", line)).ok();
            }
        });
    }

    // Stream stderr in real-time
    if let Some(stderr) = child.stderr.take() {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                app_clone.emit("svn-output", &format!("{}\n", line)).ok();
            }
        });
    }

    let output = child.wait_with_output().await.map_err(|err| err.to_string())?;
    
    // Log output for debugging
    eprintln!("SVN commit exit code: {}", output.status.code().unwrap_or(-1));
    
    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout_msg = String::from_utf8_lossy(&output.stdout).trim().to_string();
        
        // Enhanced error message
        let mut full_error = error_msg.clone();
        if !stdout_msg.is_empty() && stdout_msg != error_msg {
            full_error = format!("{}\n\n{}", error_msg, stdout_msg);
        }
        
        // Check if it's an authentication error
        if error_msg.contains("Authentication") || error_msg.contains("Password incorrect") || error_msg.contains("authorization") {
            let mut suggestion = String::new();
            suggestion.push_str("Authentication failed. Please check:\n");
            if commit_username.is_some() {
                suggestion.push_str(&format!("1. Username: {}\n", commit_username.as_ref().unwrap()));
            }
            suggestion.push_str("2. Password: Verify the password is correct in the Connections tab\n");
            suggestion.push_str("3. Test the connection in the Connections tab to verify credentials\n");
            if !repo_root_url.is_empty() {
                suggestion.push_str(&format!("4. Connection URL must match: {}\n", repo_root_url));
            }
            return Err(format!("{}\n\n{}", error_msg, suggestion));
        }
        
        // Check if it's a network/connection error (including E210002)
        if error_msg.contains("Network connection") || error_msg.contains("connection closed") || error_msg.contains("E210002") {
            let mut suggestion = String::new();
            if !repo_url.is_empty() && (repo_url.starts_with("svn://") || repo_url.starts_with("http://") || repo_url.starts_with("https://")) {
                suggestion.push_str("⚠️ Network connection closed during commit (E210002).\n\n");
                suggestion.push_str("This is a known issue with svnserve. The commit reaches 'Committing transaction...' but then fails.\n\n");
                suggestion.push_str("🔧 Workarounds:\n");
                suggestion.push_str("1. For LOCAL repositories, use file:// URLs instead of svn://\n");
                suggestion.push_str("   - Checkout using: svn checkout file:///absolute/path/to/repo\n");
                suggestion.push_str("   - This bypasses svnserve entirely\n");
                suggestion.push_str("2. Restart svnserve:\n");
                suggestion.push_str("   killall svnserve && svnserve -d -r [repo-path]\n");
                suggestion.push_str("3. Check repository state:\n");
                suggestion.push_str("   - Run: svnadmin verify [repository-path]\n");
                suggestion.push_str("   - Check for locks: ls -la [repo]/db/locks/\n");
                if !repo_root_url.is_empty() {
                    suggestion.push_str(&format!("4. Connection URL: {}\n", repo_root_url));
                }
                suggestion.push_str("\n💡 For production, consider using Apache mod_dav_svn instead of svnserve for better reliability.");
            } else {
                suggestion = "Network connection failed. Please check your network connection and SVN server status.".to_string();
            }
            return Err(format!("{}\n\n{}", error_msg, suggestion));
        }
        
        // If it's an auth error and we didn't use credentials, suggest using them
        if (error_msg.contains("authentication") || error_msg.contains("authorization")) && commit_username.is_none() {
            return Err(format!("{}\n\nNote: This repository requires authentication. Please add a connection in the Connections tab with the correct username and password.", error_msg));
        }
        
        return Err(full_error);
    }
    
    let output_str = String::from_utf8_lossy(&output.stdout).to_string();

    // Parse the output to extract revision
    let mut revision = String::new();
    for line in output_str.lines() {
        // Look for: "Committed revision X."
        if line.contains("Committed revision") {
            if let Some(rev) = line.split_whitespace().nth(2) {
                revision = rev.trim_end_matches('.').to_string();
            }
        }
    }

    Ok(CommitResult {
        revision: if revision.is_empty() {
            "unknown".into()
        } else {
            revision
        },
        files_committed: files.len(),
        output: output_str,
    })
}

#[tauri::command]
pub async fn open_folder_dialog(
    app: AppHandle,
    _title: Option<String>,
    _default_path: Option<String>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;
    
    let dialog = app.dialog();
    let file_dialog = dialog.file();
    
    // Tauri v2 dialog uses callbacks - convert to async using a channel
    let (tx, rx) = oneshot::channel();
    
    file_dialog.pick_folder(move |result| {
        let _ = tx.send(result);
    });
    
    // Wait for the callback result
    match rx.await {
        Ok(Some(path)) => {
            // FilePath can be converted to string via Display or to_path_buf()
            Ok(Some(path.to_string()))
        },
        Ok(None) => Ok(None),
        Err(_) => Err("Dialog was cancelled or failed".into()),
    }
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    _default_filename: Option<String>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;
    
    let dialog = app.dialog();
    let file_dialog = dialog.file();
    
    // Tauri v2 dialog uses callbacks - convert to async using a channel
    let (tx, rx) = oneshot::channel();
    
    file_dialog.save_file(move |result| {
        let _ = tx.send(result);
    });
    
    // Wait for the callback result
    match rx.await {
        Ok(Some(path)) => Ok(Some(path.to_string())),
        Ok(None) => Ok(None),
        Err(_) => Err("Dialog was cancelled or failed".into()),
    }
}

struct RepoInfo {
    revision: String,
    branch: String,
    changes: usize,
}

#[tauri::command]
pub async fn add_files_to_svn(
    app: AppHandle,
    working_copy_path: String,
    files: Vec<String>,
) -> Result<String, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    if files.is_empty() {
        return Err("No files selected to add".into());
    }

    // Validate all files are within the working copy and normalize paths
    let mut normalized_files: Vec<String> = Vec::new();
    for file in &files {
        let file_path = PathBuf::from(file);
        let full_path = if file_path.is_absolute() {
            file_path.clone()
        } else {
            path.join(&file_path)
        };
        
        // Check if file exists
        if !full_path.exists() {
            return Err(format!("File does not exist: {}", file));
        }
        
        // Ensure file is within working copy
        if !full_path.starts_with(&path) {
            return Err(format!("File {} is outside the working copy at {}", file, path.display()));
        }
        
        // Convert to relative path for SVN command
        if let Ok(relative) = full_path.strip_prefix(&path) {
            normalized_files.push(relative.to_string_lossy().replace('\\', "/"));
        } else {
            normalized_files.push(file.clone());
        }
    }

    // Build add command: svn add --force [files...]
    let mut command = Command::new("svn");
    command.arg("add");
    command.arg("--force"); // Add directories recursively
    
    // Add files to add
    for file in &normalized_files {
        command.arg(file);
    }
    
    command.current_dir(&path);
    command.arg("--non-interactive");
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    eprintln!("Adding {} files to SVN: {:?}", normalized_files.len(), normalized_files);
    
    // Emit command being executed
    let cmd_str = format!("svn add --force {}", normalized_files.join(" "));
    app.emit("svn-output", &format!("$ {}\n", cmd_str)).ok();
    
    // For directories, SVN add might not show output immediately, so we'll verify after
    
    let mut child = command.spawn().map_err(|err| {
        format!("Failed to execute svn add: {}", err)
    })?;

    // Stream stdout in real-time
    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                app_clone.emit("svn-output", &format!("{}\n", line)).ok();
            }
        });
    }

    // Stream stderr in real-time
    if let Some(stderr) = child.stderr.take() {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                app_clone.emit("svn-output", &format!("{}\n", line)).ok();
            }
        });
    }

    let output = child.wait_with_output().await.map_err(|err| {
        format!("Failed to wait for svn add: {}", err)
    })?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        app.emit("svn-output", &format!("Error: {}\n", error_msg)).ok();
        return Err(format!("Failed to add files to SVN: {}", error_msg));
    }

    // Emit any stdout output (svn add usually doesn't output anything on success)
    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.trim().is_empty() {
        app.emit("svn-output", &stdout).ok();
    }
    
    // Small delay to let SVN update its internal state
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    // Verify the add worked by checking status
    // This helps ensure SVN has updated its internal state
    let status_output = run_svn(&["status"], Some(&path)).await.ok();
    if let Some(status) = status_output {
        for file in &normalized_files {
            // Check if the file now shows as 'A' (added) in status
            let file_name = file.trim_end_matches('/'); // Remove trailing slash for directories
            for line in status.lines() {
                if line.trim().starts_with('A') {
                    let status_path = if line.len() > 7 {
                        line[7..].trim()
                    } else {
                        continue;
                    };
                    // Check if this line matches our added file (exact match or starts with)
                    if status_path == file_name || status_path.starts_with(&format!("{}/", file_name)) {
                        app.emit("svn-output", &format!("Verified: {} is now added (A)\n", file)).ok();
                        break;
                    }
                }
            }
        }
    }

    eprintln!("Successfully added {} files to SVN", normalized_files.len());
    Ok(format!("Successfully added {} files to SVN", files.len()))
}

#[tauri::command]
pub async fn delete_files_from_svn(
    app: AppHandle,
    working_copy_path: String,
    files: Vec<String>,
) -> Result<String, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    if files.is_empty() {
        return Err("No files selected to delete".into());
    }

    // Check SVN status to see which files are already deleted or unversioned
    let status_output = run_svn(&["status"], Some(&path)).await?;
    let mut already_deleted: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut unversioned_files: std::collections::HashSet<String> = std::collections::HashSet::new();
    
    for line in status_output.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let status_char = line.chars().next().unwrap_or(' ');
        let status_path = if line.len() > 7 {
            line[7..].trim()
        } else {
            line.trim()
        };
        
        if status_char == 'D' {
            // File is already marked for deletion
            already_deleted.insert(status_path.to_string());
        } else if status_char == '?' {
            // File is unversioned
            unversioned_files.insert(status_path.to_string());
        }
    }
    
    // Validate all files are within the working copy and normalize paths
    let mut normalized_files: Vec<String> = Vec::new();
    let mut skipped_files: Vec<String> = Vec::new();
    let mut unversioned_to_delete: Vec<String> = Vec::new();
    
    for file in &files {
        // Check if file is already deleted
        if already_deleted.contains(file) {
            skipped_files.push(file.clone());
            continue;
        }
        
        // Check if file is unversioned - for unversioned files, we just delete from filesystem
        if unversioned_files.contains(file) {
            unversioned_to_delete.push(file.clone());
            continue;
        }
        
        let file_path = PathBuf::from(file);
        let full_path = if file_path.is_absolute() {
            file_path.clone()
        } else {
            path.join(&file_path)
        };
        
        // For delete, file might not exist if already deleted, but we still need to validate path
        // Ensure path is within working copy
        if !full_path.starts_with(&path) {
            return Err(format!("File {} is outside the working copy at {}", file, path.display()));
        }
        
        // Convert to relative path for SVN command
        if let Ok(relative) = full_path.strip_prefix(&path) {
            normalized_files.push(relative.to_string_lossy().replace('\\', "/"));
        } else {
            normalized_files.push(file.clone());
        }
    }
    
    // Delete unversioned files from filesystem
    if !unversioned_to_delete.is_empty() {
        use std::fs;
        for file in &unversioned_to_delete {
            let file_path = PathBuf::from(file);
            let full_path = if file_path.is_absolute() {
                file_path.clone()
            } else {
                path.join(&file_path)
            };
            
            if full_path.exists() {
                if full_path.is_dir() {
                    fs::remove_dir_all(&full_path).map_err(|e| {
                        format!("Failed to delete unversioned directory {}: {}", file, e)
                    })?;
                } else {
                    fs::remove_file(&full_path).map_err(|e| {
                        format!("Failed to delete unversioned file {}: {}", file, e)
                    })?;
                }
                app.emit("svn-output", &format!("Deleted unversioned: {}\n", file)).ok();
            }
        }
    }
    
    // If all files are already deleted or unversioned, return early
    if normalized_files.is_empty() {
        if !skipped_files.is_empty() && unversioned_to_delete.is_empty() {
            return Err(format!("All selected files are already marked for deletion: {}", skipped_files.join(", ")));
        }
        if !unversioned_to_delete.is_empty() && skipped_files.is_empty() {
            // All files were unversioned and deleted from filesystem
            return Ok(format!("Deleted {} unversioned file(s) from filesystem", unversioned_to_delete.len()));
        }
        if !skipped_files.is_empty() && !unversioned_to_delete.is_empty() {
            return Ok(format!("Deleted {} unversioned file(s) from filesystem. {} file(s) already marked for deletion.", 
                             unversioned_to_delete.len(), skipped_files.len()));
        }
        return Err("No files to delete".into());
    }
    
    // Log skipped files if any
    if !skipped_files.is_empty() {
        eprintln!("Skipping already deleted files: {:?}", skipped_files);
        app.emit("svn-output", &format!("Note: {} file(s) already marked for deletion, skipping\n", skipped_files.len())).ok();
    }
    
    if !unversioned_to_delete.is_empty() {
        app.emit("svn-output", &format!("Note: {} unversioned file(s) deleted from filesystem\n", unversioned_to_delete.len())).ok();
    }

    // Build delete command: svn delete --force [files...]
    // --force flag allows deletion even if file doesn't exist locally
    let mut command = Command::new("svn");
    command.arg("delete");
    command.arg("--force");
    
    // Add files to delete
    for file in &normalized_files {
        command.arg(file);
    }
    
    command.current_dir(&path);
    command.arg("--non-interactive");
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    eprintln!("Deleting {} files from SVN: {:?}", normalized_files.len(), normalized_files);
    eprintln!("Working copy path: {}", path.display());
    eprintln!("Normalized files: {:?}", normalized_files);
    
    // Validate normalized files are not empty
    if normalized_files.is_empty() {
        return Err("No valid files to delete after filtering".into());
    }
    
    // Emit command being executed
    let cmd_str = format!("svn delete --force {}", normalized_files.join(" "));
    app.emit("svn-output", &format!("$ {}\n", cmd_str)).ok();
    
    let mut child = command.spawn().map_err(|err| {
        format!("Failed to execute svn delete: {}", err)
    })?;

    // Stream stdout in real-time
    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                app_clone.emit("svn-output", &format!("{}\n", line)).ok();
            }
        });
    }

    // Stream stderr in real-time
    if let Some(stderr) = child.stderr.take() {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                app_clone.emit("svn-output", &format!("{}\n", line)).ok();
            }
        });
    }

    let output = child.wait_with_output().await.map_err(|err| {
        format!("Failed to wait for svn delete: {}", err)
    })?;

    if !output.status.success() {
        let stderr_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout_msg = String::from_utf8_lossy(&output.stdout).trim().to_string();
        
        // Clone for logging before moving into error_msg
        let stderr_debug = stderr_msg.clone();
        let stdout_debug = stdout_msg.clone();
        
        // Use stderr if available, otherwise use stdout, otherwise provide helpful message
        let error_msg = if !stderr_msg.is_empty() {
            stderr_msg
        } else if !stdout_msg.is_empty() {
            stdout_msg
        } else {
            // SVN failed silently - provide helpful diagnostic message
            let mut diagnostic = format!("SVN delete command failed with exit code: {:?}", output.status.code());
            diagnostic.push_str("\n\nPossible reasons:");
            diagnostic.push_str("\n- File may not be tracked by SVN (unversioned)");
            diagnostic.push_str("\n- File may already be deleted");
            diagnostic.push_str("\n- Insufficient permissions");
            diagnostic.push_str("\n- Working copy may be locked or corrupted");
            diagnostic.push_str(&format!("\n\nFile(s) attempted: {}", normalized_files.join(", ")));
            diagnostic
        };
        
        app.emit("svn-output", &format!("Error: {}\n", error_msg)).ok();
        eprintln!("SVN delete failed - stderr: {:?}, stdout: {:?}, exit_code: {:?}", 
                  stderr_debug, stdout_debug, output.status.code());
        return Err(format!("Failed to delete files from SVN: {}", error_msg));
    }

    // Emit any stdout output
    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.trim().is_empty() {
        app.emit("svn-output", &stdout).ok();
    }
    
    // Small delay to let SVN update its internal state
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    eprintln!("Successfully deleted {} files from SVN", normalized_files.len());
    Ok(format!("Successfully deleted {} files from SVN", files.len()))
}

#[tauri::command]
pub async fn move_file_in_svn(
    app: AppHandle,
    working_copy_path: String,
    source_path: String,
    destination_path: String,
) -> Result<String, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Normalize source path
    let source_file = PathBuf::from(&source_path);
    let full_source = if source_file.is_absolute() {
        source_file.clone()
    } else {
        path.join(&source_file)
    };
    
    // Normalize destination path
    let dest_file = PathBuf::from(&destination_path);
    let full_dest = if dest_file.is_absolute() {
        dest_file.clone()
    } else {
        path.join(&dest_file)
    };
    
    // Ensure both paths are within working copy
    if !full_source.starts_with(&path) {
        return Err(format!("Source file {} is outside the working copy at {}", source_path, path.display()));
    }
    
    if !full_dest.starts_with(&path) {
        return Err(format!("Destination path {} is outside the working copy at {}", destination_path, path.display()));
    }
    
    // Convert to relative paths for SVN command
    let relative_source = full_source.strip_prefix(&path)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_else(|_| source_path.clone());
    
    let relative_dest = full_dest.strip_prefix(&path)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_else(|_| destination_path.clone());

    // Build move command: svn move [source] [destination]
    let mut command = Command::new("svn");
    command.arg("move");
    command.arg(&relative_source);
    command.arg(&relative_dest);
    
    command.current_dir(&path);
    command.arg("--non-interactive");
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    eprintln!("Moving {} to {} in SVN", relative_source, relative_dest);
    
    // Emit command being executed
    let cmd_str = format!("svn move {} {}", relative_source, relative_dest);
    app.emit("svn-output", &format!("$ {}\n", cmd_str)).ok();
    
    let mut child = command.spawn().map_err(|err| {
        format!("Failed to execute svn move: {}", err)
    })?;

    // Stream stdout in real-time
    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                app_clone.emit("svn-output", &format!("{}\n", line)).ok();
            }
        });
    }

    // Stream stderr in real-time
    if let Some(stderr) = child.stderr.take() {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                app_clone.emit("svn-output", &format!("{}\n", line)).ok();
            }
        });
    }

    let output = child.wait_with_output().await.map_err(|err| {
        format!("Failed to wait for svn move: {}", err)
    })?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        app.emit("svn-output", &format!("Error: {}\n", error_msg)).ok();
        return Err(format!("Failed to move file in SVN: {}", error_msg));
    }

    // Emit any stdout output
    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.trim().is_empty() {
        app.emit("svn-output", &stdout).ok();
    }
    
    // Small delay to let SVN update its internal state
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    eprintln!("Successfully moved {} to {}", relative_source, relative_dest);
    Ok(format!("Successfully moved {} to {}", source_path, destination_path))
}

#[tauri::command]
pub async fn get_repository_root_url(working_copy_path: String) -> Result<String, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }
    
    let info_output = run_svn(&["info", "--show-item", "repos-root-url"], Some(&path)).await?;
    Ok(info_output.trim().to_string())
}

#[tauri::command]
pub async fn inspect_repository(repo_path: String) -> Result<String, String> {
    // Use svnlook to inspect the repository directly
    let path = PathBuf::from(&repo_path);
    if !path.exists() {
        return Err("Repository path does not exist".into());
    }
    
    // Get the youngest revision
    let mut youngest_cmd = Command::new("svnlook");
    youngest_cmd.arg("youngest").arg(&repo_path);
    let youngest_output = youngest_cmd.output().await.map_err(|err| err.to_string())?;
    let youngest = if youngest_output.status.success() {
        String::from_utf8_lossy(&youngest_output.stdout).trim().to_string()
    } else {
        "0".to_string()
    };
    
    // Get the tree structure
    let mut tree_cmd = Command::new("svnlook");
    tree_cmd.arg("tree").arg(&repo_path).arg("--full-paths");
    let tree_output = tree_cmd.output().await.map_err(|err| err.to_string())?;
    let tree = if tree_output.status.success() {
        String::from_utf8_lossy(&tree_output.stdout).to_string()
    } else {
        String::from_utf8_lossy(&tree_output.stderr).to_string()
    };
    
    // Get changed files
    let mut changed_cmd = Command::new("svnlook");
    changed_cmd.arg("changed").arg(&repo_path);
    let changed_output = changed_cmd.output().await.map_err(|err| err.to_string())?;
    let changed = if changed_output.status.success() {
        String::from_utf8_lossy(&changed_output.stdout).to_string()
    } else {
        String::from_utf8_lossy(&changed_output.stderr).to_string()
    };
    
    Ok(format!(
        "Repository: {}\nYoungest Revision: {}\n\nTree Structure:\n{}\n\nChanged Files:\n{}",
        repo_path, youngest, tree, changed
    ))
}

#[tauri::command]
pub async fn get_commit_history(
    working_copy_path: String,
    limit: Option<usize>,
    offset: Option<usize>,
    search: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    author: Option<String>,
    path_filter: Option<String>,
    stop_on_copy: Option<bool>,
    include_merged: Option<bool>,
    use_regex: Option<bool>,
    case_sensitive: Option<bool>,
) -> Result<Vec<CommitLogEntry>, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Calculate how many commits to fetch
    // For infinite scroll: if offset is 0, fetch limit entries
    // If offset > 0, we need to fetch offset + limit entries, then take the last 'limit' entries
    let offset_val = offset.unwrap_or(0);
    let limit_val = limit.unwrap_or(100);
    let fetch_limit = if offset_val == 0 {
        limit_val
    } else {
        // Fetch from beginning up to offset + limit, then we'll slice
        offset_val + limit_val
    };
    let fetch_limit = fetch_limit.max(100); // Fetch at least 100

    // Use svn log with XML output for easier parsing
    // --limit limits the number of entries
    // -v shows changed paths
    // Note: svn log returns newest first, so we fetch from HEAD backwards
    let mut command = Command::new("svn");
    command.arg("log");
    command.arg("--xml");
    command.arg("-v"); // Show changed paths
    
    // Always explicitly fetch from HEAD to ensure we get the latest commits
    // This helps bypass any local caching issues
    if date_from.is_none() && date_to.is_none() {
        // If no date filter, explicitly specify HEAD to ensure fresh data
        command.arg("--revision");
        command.arg("HEAD:1"); // From HEAD down to revision 1
    } else {
        // SVN log supports date ranges using {DATE} syntax
        // Format: {YYYY-MM-DD} or {YYYY-MM-DDTHH:MM:SS}
        if let Some(from) = &date_from {
            // Use date syntax: {YYYY-MM-DD}
            command.arg("--revision");
            command.arg(format!("{{{}}}:HEAD", from));
        } else {
            // No start date, fetch from HEAD
            command.arg("--revision");
            command.arg("HEAD:1");
        }
        // date_to will be filtered in Rust after fetching
    }
    
    // Enable/disable following copy history
    if let Some(true) = stop_on_copy {
        command.arg("--stop-on-copy");
    }

    // Include merged revisions in the history
    if let Some(true) = include_merged {
        // --use-merge-history is equivalent to -g
        command.arg("--use-merge-history");
    }

    command.arg("--limit");
    command.arg(fetch_limit.to_string());
    command.current_dir(&path);
    command.arg("--non-interactive");
    // Force update to get latest commits (bypass any caching)
    command.arg("--no-auth-cache"); // Don't cache auth, but more importantly, ensures fresh data

    let output = command.output().await.map_err(|err| err.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let xml_output = String::from_utf8_lossy(&output.stdout);
    let mut entries = parse_log_xml(&xml_output)?;
    
    // Apply server-side filtering with advanced search options
    if let Some(search_term) = &search {
        let use_regex_flag = use_regex.unwrap_or(false);
        let case_sensitive_flag = case_sensitive.unwrap_or(false);
        
        // Prepare search term for regex compilation (lowercase if needed)
        let search_term_for_regex = if case_sensitive_flag {
            search_term.clone()
        } else {
            search_term.to_lowercase()
        };
        
        // Compile regex if enabled, otherwise use simple string matching
        let regex_pattern = if use_regex_flag {
            // Try to compile the regex pattern
            match regex::Regex::new(&search_term_for_regex) {
                Ok(re) => Some(re),
                Err(_) => {
                    // Invalid regex, fall back to simple string matching
                    None
                }
            }
        } else {
            None
        };
        
        // Prepare search text for simple matching (if not using regex)
        let search_text_for_matching = if case_sensitive_flag {
            search_term.clone()
        } else {
            search_term.to_lowercase()
        };
        
        entries.retain(|entry| {
            let matches = if let Some(ref regex) = regex_pattern {
                // Use regex matching
                if case_sensitive_flag {
                    // Case-sensitive: use original strings
                    regex.is_match(&entry.revision) ||
                    regex.is_match(&entry.author) ||
                    regex.is_match(&entry.message) ||
                    regex.is_match(&entry.branch) ||
                    entry.changed_paths.iter().any(|p| regex.is_match(&p.path))
                } else {
                    // Case-insensitive: lowercase before matching
                    let revision_lower = entry.revision.to_lowercase();
                    let author_lower = entry.author.to_lowercase();
                    let message_lower = entry.message.to_lowercase();
                    let branch_lower = entry.branch.to_lowercase();
                    
                    regex.is_match(&revision_lower) ||
                    regex.is_match(&author_lower) ||
                    regex.is_match(&message_lower) ||
                    regex.is_match(&branch_lower) ||
                    entry.changed_paths.iter().any(|p| {
                        let path_lower = p.path.to_lowercase();
                        regex.is_match(&path_lower)
                    })
                }
            } else {
                // Use simple string matching
                if case_sensitive_flag {
                    // Case-sensitive: use original strings
                    entry.revision.contains(search_term) ||
                    entry.author.contains(search_term) ||
                    entry.message.contains(search_term) ||
                    entry.branch.contains(search_term) ||
                    entry.changed_paths.iter().any(|p| p.path.contains(search_term))
                } else {
                    // Case-insensitive: lowercase before matching
                    let revision_lower = entry.revision.to_lowercase();
                    let author_lower = entry.author.to_lowercase();
                    let message_lower = entry.message.to_lowercase();
                    let branch_lower = entry.branch.to_lowercase();
                    
                    revision_lower.contains(&search_text_for_matching) ||
                    author_lower.contains(&search_text_for_matching) ||
                    message_lower.contains(&search_text_for_matching) ||
                    branch_lower.contains(&search_text_for_matching) ||
                    entry.changed_paths.iter().any(|p| {
                        let path_lower = p.path.to_lowercase();
                        path_lower.contains(&search_text_for_matching)
                    })
                }
            };
            matches
        });
    }

    // Filter by author (exact match)
    if let Some(author_filter) = &author {
        let author_lower = author_filter.to_lowercase();
        entries.retain(|entry| entry.author.to_lowercase() == author_lower);
    }

    // Filter by affected path (substring match on changed paths)
    if let Some(path) = &path_filter {
        let path_lower = path.to_lowercase();
        entries.retain(|entry| {
            entry
                .changed_paths
                .iter()
                .any(|p| p.path.to_lowercase().contains(&path_lower))
        });
    }
    
    // Filter by date range (SVN dates are ISO 8601 format)
    if let Some(from) = &date_from {
        // Filter entries on or after the start date
        entries.retain(|entry| {
            entry.date >= *from || entry.date.starts_with(from)
        });
    }
    if let Some(to) = &date_to {
        // Filter entries on or before the end date
        entries.retain(|entry| {
            entry.date <= *to || entry.date.starts_with(to)
        });
    }
    
    // Apply offset and limit for pagination
    let offset = offset.unwrap_or(0);
    let limit = limit.unwrap_or(100);
    
    if offset >= entries.len() {
        return Ok(Vec::new());
    }
    
    let end = (offset + limit).min(entries.len());
    Ok(entries[offset..end].to_vec())
}

fn parse_log_xml(xml: &str) -> Result<Vec<CommitLogEntry>, String> {
    use quick_xml::events::Event;
    use quick_xml::Reader;
    
    let mut reader = Reader::from_str(xml);
    reader.trim_text(true);
    
    let mut entries = Vec::new();
    let mut current_entry: Option<CommitLogEntry> = None;
    let mut current_paths: Vec<ChangedPath> = Vec::new();
    let mut current_tag = String::new();
    
    loop {
        match reader.read_event() {
            Ok(Event::Start(e)) => {
                match e.name().as_ref() {
                    b"logentry" => {
                        // Start of a new log entry
                        if let Some(entry) = current_entry.take() {
                            entries.push(entry);
                        }
                        current_entry = Some(CommitLogEntry {
                            revision: String::new(),
                            author: String::new(),
                            date: String::new(),
                            message: String::new(),
                            changed_paths: Vec::new(),
                            stats: CommitStats {
                                added: 0,
                                modified: 0,
                                deleted: 0,
                                replaced: 0,
                            },
                            branch: String::new(),
                        });
                        current_paths.clear();
                        // Get revision from attribute
                        for attr in e.attributes() {
                            if let Ok(attr) = attr {
                                if attr.key.as_ref() == b"revision" {
                                    if let Some(entry) = &mut current_entry {
                                        entry.revision = String::from_utf8_lossy(&attr.value).to_string();
                                    }
                                }
                            }
                        }
                    }
                    b"path" => {
                        // Start of a changed path
                        let mut new_path = ChangedPath {
                            path: String::new(),
                            action: String::new(),
                            copyfrom_path: None,
                            copyfrom_rev: None,
                        };
                        // Set current_tag so we can capture the path text
                        current_tag = "path".to_string();
                        // Get attributes (action, copyfrom-path, copyfrom-rev)
                        for attr in e.attributes() {
                            if let Ok(attr) = attr {
                                match attr.key.as_ref() {
                                    b"action" => {
                                        new_path.action = String::from_utf8_lossy(&attr.value).to_string();
                                    }
                                    b"copyfrom-path" => {
                                        new_path.copyfrom_path = Some(String::from_utf8_lossy(&attr.value).to_string());
                                    }
                                    b"copyfrom-rev" => {
                                        new_path.copyfrom_rev = Some(String::from_utf8_lossy(&attr.value).to_string());
                                    }
                                    _ => {}
                                }
                            }
                        }
                        current_paths.push(new_path);
                    }
                    _ => {
                        current_tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    }
                }
            }
            Ok(Event::Text(e)) => {
                let text = e.unescape().unwrap_or_default();
                match current_tag.as_str() {
                    "author" => {
                        if let Some(entry) = &mut current_entry {
                            entry.author = text.to_string();
                        }
                    }
                    "date" => {
                        if let Some(entry) = &mut current_entry {
                            entry.date = text.to_string();
                        }
                    }
                    "msg" => {
                        if let Some(entry) = &mut current_entry {
                            entry.message.push_str(&text);
                        }
                    }
                    "path" => {
                        if let Some(path) = current_paths.last_mut() {
                            path.path = text.to_string();
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::End(e)) => {
                match e.name().as_ref() {
                    b"logentry" => {
                        // End of log entry, save changed paths
                        if let Some(entry) = &mut current_entry {
                            entry.changed_paths = current_paths.clone();
                            current_paths.clear();
                        }
                    }
                    b"paths" => {
                        // End of paths section
                        if let Some(entry) = &mut current_entry {
                            entry.changed_paths = current_paths.clone();
                        }
                    }
                    b"path" => {
                        // End of path tag - clear current_tag
                        current_tag.clear();
                    }
                    _ => {
                        current_tag.clear();
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML parsing error: {}", e)),
            _ => {}
        }
    }
    
    // Don't forget the last entry
    if let Some(entry) = current_entry {
        entries.push(entry);
    }
    
    // Calculate stats and infer branch for each entry
    for entry in &mut entries {
        let mut stats = CommitStats {
            added: 0,
            modified: 0,
            deleted: 0,
            replaced: 0,
        };
        
        // Infer branch from changed paths (most common path prefix)
        let mut path_prefixes: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        
        for path in &entry.changed_paths {
            // Count stats
            match path.action.as_str() {
                "A" => stats.added += 1,
                "M" => stats.modified += 1,
                "D" => stats.deleted += 1,
                "R" => stats.replaced += 1,
                _ => {}
            }
            
            // Extract path prefix (branch) - e.g., "trunk/file.txt" -> "trunk"
            let parts: Vec<&str> = path.path.split('/').collect();
            if parts.len() > 1 {
                let prefix = parts[0].to_string();
                *path_prefixes.entry(prefix).or_insert(0) += 1;
            } else if !path.path.is_empty() {
                // Root level file
                *path_prefixes.entry("".to_string()).or_insert(0) += 1;
            }
        }
        
        // Find most common prefix (branch)
        let branch = path_prefixes
            .iter()
            .max_by_key(|(_, count)| *count)
            .map(|(prefix, _)| {
                if prefix.is_empty() {
                    "trunk".to_string()
                } else {
                    prefix.clone()
                }
            })
            .unwrap_or_else(|| "trunk".to_string());
        
        entry.stats = stats;
        entry.branch = branch;
    }
    
    Ok(entries)
}

async fn get_repository_info(working_copy: &Path) -> Result<RepoInfo, String> {
    let info_output = run_svn(&["info"], Some(working_copy)).await?;
    let mut revision = String::new();
    let mut relative_url = String::new();

    for line in info_output.lines() {
        if let Some(value) = line.strip_prefix("Revision:") {
            revision = value.trim().to_string();
        } else if let Some(value) = line.strip_prefix("Relative URL:") {
            relative_url = value.trim().to_string();
        }
    }

    let branch = relative_url.trim_start_matches("^/").to_string();
    let changes = count_changes(working_copy).await.unwrap_or(0);

    Ok(RepoInfo {
        revision,
        branch,
        changes,
    })
}

async fn count_changes(working_copy: &Path) -> Result<usize, String> {
    let output = run_svn(&["status"], Some(working_copy)).await?;
    Ok(output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .count())
}

#[tauri::command]
pub async fn list_remote_entries(
    base_url: String,
    path: String,
    username: String,
    password: String,
) -> Result<Vec<RemoteEntry>, String> {
    let target = build_remote_url(&base_url, &path);
    eprintln!("Listing remote entries for: {}", target);
    
    // Use svn list - by default shows immediate children only
    // Try with --recursive flag first to see if there are nested items, but we only want immediate children
    // So we use the default behavior (immediate children only)
    let args = vec!["list".into(), target.clone()];
    let output = run_svn_with_credentials(args, &username, &password, None).await?;
    
    eprintln!("SVN list output (raw): {:?}", output);
    eprintln!("SVN list output (lines): {}", output.lines().count());
    
    // Also try to get verbose output to see if we're missing anything
    let args_verbose = vec!["list".into(), "--verbose".into(), target.clone()];
    if let Ok(verbose_output) = run_svn_with_credentials(args_verbose, &username, &password, None).await {
        eprintln!("SVN list verbose output: {:?}", verbose_output);
    }
    
    let entries = parse_remote_entries(&output);
    eprintln!("Parsed {} entries", entries.len());
    for entry in &entries {
        eprintln!("  - {} ({})", entry.name, entry.kind);
    }
    
    Ok(entries)
}

#[tauri::command]
pub async fn get_remote_file_content(
    base_url: String,
    path: String,
    username: String,
    password: String,
) -> Result<String, String> {
    let target = build_remote_url(&base_url, &path);
    eprintln!("Getting remote file content for: {}", target);
    
    // Use svn cat to get file content from remote
    let args = vec!["cat".into(), target.clone()];
    let output = run_svn_with_credentials(args, &username, &password, None).await?;
    
    Ok(output)
}

async fn run_svn(args: &[&str], cwd: Option<&Path>) -> Result<String, String> {
    let mut command = Command::new("svn");
    command.args(args);
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    let output = command.output().await.map_err(|err| err.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

async fn run_svn_with_credentials(
    args: Vec<String>,
    username: &str,
    password: &str,
    cwd: Option<&Path>,
) -> Result<String, String> {
    let mut command = Command::new("svn");
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    for arg in args {
        command.arg(arg);
    }
    command
        .arg("--username")
        .arg(username)
        .arg("--password")
        .arg(password)
        .arg("--non-interactive")
        .arg("--trust-server-cert");

    let output = command.output().await.map_err(|err| err.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

async fn run_svn_with_ssh_key(
    args: Vec<String>,
    username: &str,
    ssh_key_path: &str,
    cwd: Option<&Path>,
) -> Result<String, String> {
    let mut command = Command::new("svn");
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    for arg in args {
        command.arg(arg);
    }
    command
        .arg("--username")
        .arg(username)
        .arg("--non-interactive")
        .arg("--trust-server-cert");

    // Set SSH environment variables to use the specified key
    let ssh_key = PathBuf::from(ssh_key_path);
    if ssh_key.exists() {
        // Set SSH_AUTH_SOCK to empty to prevent using SSH agent
        command.env("SSH_AUTH_SOCK", "");
        // Use SVN_SSH to specify SSH command with key
        let ssh_cmd = format!("ssh -i {} -o StrictHostKeyChecking=no", ssh_key.display());
        command.env("SVN_SSH", ssh_cmd);
    }

    let output = command.output().await.map_err(|err| err.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub async fn revert_to_revision(
    app: AppHandle,
    working_copy_path: String,
    revision: String,
) -> Result<String, String> {
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Revert to a specific revision using merge
    // svn merge -r REV:REV-1 . (reverse merge)
    let rev_num: i32 = revision.parse().map_err(|_| "Invalid revision number")?;
    let prev_rev = if rev_num > 1 {
        format!("{}", rev_num - 1)
    } else {
        return Err("Cannot revert to revision 1 or earlier".into());
    };

    app.emit("svn-output", &format!("$ svn merge -r {}:{} .\n", revision, prev_rev)).ok();

    let output = run_svn(&["merge", "-r", &format!("{}:{}", revision, prev_rev), "."], Some(&working_copy)).await?;
    
    app.emit("svn-output", &format!("✓ Reverted to revision {}\n", prev_rev)).ok();
    Ok(output)
}

#[tauri::command]
pub async fn merge_revisions(
    app: AppHandle,
    working_copy_path: String,
    source_revision: String,
    target_revision: Option<String>,
    source_url: Option<String>,
) -> Result<String, String> {
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Get repository root URL if source_url is not provided
    let repo_url = if let Some(url) = source_url {
        url
    } else {
        get_repository_root_url(working_copy_path.clone()).await?
    };

    // Build merge command
    // If target_revision is provided: merge range from source to target
    // Otherwise: merge single revision using -c flag
    let merge_desc = if let Some(target) = &target_revision {
        // Merge range: -r REV1:REV2
        let range_str = format!("{}:{}", source_revision, target);
        app.emit("svn-output", &format!("$ svn merge -r {} {}\n", range_str, repo_url)).ok();
        let _output = run_svn(&["merge", "-r", &range_str, &repo_url], Some(&working_copy)).await?;
        range_str
    } else {
        // Merge single revision: -c REV
        app.emit("svn-output", &format!("$ svn merge -c {} {}\n", source_revision, repo_url)).ok();
        let _output = run_svn(&["merge", "-c", &source_revision, &repo_url], Some(&working_copy)).await?;
        source_revision.clone()
    };

    app.emit("svn-output", &format!("✓ Merged revision(s) {} into working copy\n", merge_desc)).ok();
    Ok(format!("Merged revision(s) {} into working copy", merge_desc))
}

#[tauri::command]
pub async fn export_revision(
    app: AppHandle,
    working_copy_path: String,
    revision: String,
    export_path: String,
) -> Result<String, String> {
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    let _export_dir = PathBuf::from(&export_path);
    
    // For HEAD revision, export from working copy, otherwise from repository URL
    if revision == "HEAD" {
        app.emit("svn-output", &format!("$ svn export . {}\n", export_path)).ok();
        let output = run_svn(
            &["export", ".", &export_path],
            Some(&working_copy),
        ).await?;
        app.emit("svn-output", &format!("✓ Exported working copy to {}\n", export_path)).ok();
        Ok(output)
    } else {
        // Get repository root URL
        let repo_root_url = get_repository_root_url(working_copy_path.clone()).await?;
        
        app.emit("svn-output", &format!("$ svn export -r {} {} {}\n", revision, repo_root_url.trim(), export_path)).ok();

        // Export from repository URL at specific revision
        let output = run_svn(
            &["export", "-r", &revision, repo_root_url.trim(), &export_path],
            None,
        ).await?;
        
        app.emit("svn-output", &format!("✓ Exported revision {} to {}\n", revision, export_path)).ok();
        Ok(output)
    }
}

#[tauri::command]
pub async fn get_file_blame(
    working_copy_path: String,
    file_path: String,
    revision: Option<String>,
) -> Result<String, String> {
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Get repository root URL to construct full repository path
    // The file_path from commit history is repository-relative (e.g., "trunk/file.txt" or "/trunk/file.txt")
    // We need to get the repository root URL and append the file path
    let info_output = run_svn(&["info", "--show-item", "repos-root-url"], Some(&working_copy)).await?;
    let repo_root_url = info_output.trim();
    
    // Construct the full repository URL for the file
    // Remove leading slash if present, then construct URL
    let normalized_path = file_path.trim_start_matches('/');
    let file_url = format!("{}/{}", repo_root_url, normalized_path);

    // Run svn blame using the repository URL
    // This works for all files including deleted ones and files from history
    // SVN blame syntax: svn blame [-r REV] URL or svn blame URL@REV
    // If revision is provided, use @REV syntax for peg revision (the revision to blame at)
    let mut args = vec!["blame".to_string()];
    if let Some(rev) = &revision {
        // Use @REV syntax for peg revision (blame at that specific revision)
        args.push(format!("{}@{}", file_url, rev));
    } else {
        args.push(file_url);
    }

    let output = run_svn(
        &args.iter().map(|s| s.as_str()).collect::<Vec<_>>(),
        Some(&working_copy),
    ).await?;
    Ok(output)
}

#[tauri::command]
pub async fn save_file_from_revision(
    working_copy_path: String,
    file_path: String,
    revision: String,
    save_path: String,
) -> Result<String, String> {
    use std::fs::File;
    use std::io::Write;

    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Get repository root URL
    let info_output = run_svn(&["info", "--show-item", "repos-root-url"], Some(&working_copy)).await?;
    let repo_root_url = info_output.trim();
    
    // Construct the full repository URL for the file
    let file_url = if file_path.starts_with('/') {
        format!("{}{}", repo_root_url, file_path)
    } else {
        format!("{}/{}", repo_root_url, file_path)
    };

    // Get file content using svn cat
    let content = run_svn(
        &["cat", "-r", &revision, &file_url],
        Some(&working_copy),
    ).await?;

    // Write to file
    let save_file = PathBuf::from(&save_path);
    if let Some(parent) = save_file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let mut file = File::create(&save_file).map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(content.as_bytes()).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(format!("File saved to {}", save_path))
}

#[tauri::command]
pub async fn compare_revisions(
    working_copy_path: String,
    file_path: Option<String>,
    revision1: String,
    revision2: String,
) -> Result<String, String> {
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Get repository root URL
    let info_output = run_svn(&["info", "--show-item", "repos-root-url"], Some(&working_copy)).await?;
    let repo_root_url = info_output.trim();
    
    // If file_path is provided, compare that specific file
    // Otherwise, compare the entire working copy
    if let Some(file_path) = file_path {
        let file_url = if file_path.starts_with('/') {
            format!("{}{}", repo_root_url, file_path)
        } else {
            format!("{}/{}", repo_root_url, file_path)
        };

        let output = run_svn(
            &["diff", "-r", &format!("{}:{}", revision1, revision2), &file_url],
            Some(&working_copy),
        ).await?;
        Ok(output)
    } else {
        // Compare entire working copy
        let output = run_svn(
            &["diff", "-r", &format!("{}:{}", revision1, revision2)],
            Some(&working_copy),
        ).await?;
        Ok(output)
    }
}

#[tauri::command]
pub async fn get_repository_url_for_revision(
    working_copy_path: String,
    revision: String,
) -> Result<String, String> {
    let working_copy = PathBuf::from(&working_copy_path);
    if !working_copy.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Get repository root URL
    let repo_root_url = get_repository_root_url(working_copy_path).await?;
    
    // Construct URL with revision
    Ok(format!("{}@{}", repo_root_url.trim(), revision))
}

fn parse_status_output(output: &str) -> Vec<FileChangeEntry> {
    let entries: Vec<FileChangeEntry> = output
        .lines()
        .filter_map(parse_status_line)
        .collect();
    
    // Normalize paths (remove trailing slashes) and deduplicate
    // SVN might show both "branch" and "branch/" - we want to keep only "branch"
    let mut normalized_entries: Vec<FileChangeEntry> = Vec::new();
    let mut seen_paths: std::collections::HashSet<String> = std::collections::HashSet::new();
    
    // First pass: normalize all paths (remove trailing slashes) and deduplicate
    for entry in &entries {
        let normalized_path = entry.name.trim_end_matches('/').to_string();
        if !normalized_path.is_empty() && !seen_paths.contains(&normalized_path) {
            seen_paths.insert(normalized_path.clone());
            normalized_entries.push(FileChangeEntry {
                name: normalized_path,
                status: entry.status.clone(),
                revision: entry.revision.clone(),
                author: entry.author.clone(),
            });
        }
    }
    
    // Second pass: identify directory entries that have files inside them
    // If we have "branch" and "branch/branch.md", we only want to show "branch/branch.md"
    // The directory itself is implicit when we show files inside it
    // This matches how Git/GitHub Desktop works - you see the files, not the directory entry
    let paths_to_remove: std::collections::HashSet<String> = normalized_entries
        .iter()
        .filter_map(|entry| {
            let path = &entry.name;
            // Check if any other entry is a file inside this directory
            let has_files_inside = normalized_entries.iter().any(|e| {
                e.name != *path && e.name.starts_with(&format!("{}/", path))
            });
            
            // If this path has files inside it, it's a directory entry - mark it for removal
            if has_files_inside {
                Some(path.clone())
            } else {
                None
            }
        })
        .collect();
    
    // Third pass: filter out the directory entries
    normalized_entries.retain(|entry| !paths_to_remove.contains(&entry.name));
    
    normalized_entries
}

pub(crate) fn parse_status_line(line: &str) -> Option<FileChangeEntry> {
    if line.trim().is_empty() {
        return None;
    }

    let status_char = line.chars().next()?;
    let path = if line.len() > 7 {
        line[7..].trim().to_string()
    } else {
        line.trim().to_string()
    };

    if path.is_empty() {
        return None;
    }

    Some(FileChangeEntry {
        name: path,
        status: map_status(status_char),
        revision: "—".into(),
        author: "—".into(),
    })
}

pub(crate) fn map_status(c: char) -> String {
    match c {
        'M' => "MODIFIED",
        'A' => "ADDED",
        'D' => "DELETED",
        'C' => "CONFLICTED",
        'R' => "REPLACED",
        '?' => "UNVERSIONED",
        '!' => "MISSING",
        _ => "NORMAL",
    }
    .into()
}

pub(crate) fn build_remote_url(base: &str, path: &str) -> String {
    let mut url = base.trim_end_matches('/').to_string();
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() || trimmed_path == "/" {
        return url;
    }

    url.push('/');
    url.push_str(trimmed_path.trim_start_matches('/'));
    url
}

pub(crate) fn parse_remote_entries(output: &str) -> Vec<RemoteEntry> {
    let mut entries: Vec<RemoteEntry> = output
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                return None;
            }
            // SVN list output: directories end with '/', files don't
            // Handle both formats: "dirname/" and "filename"
            let kind = if trimmed.ends_with('/') {
                "directory"
            } else {
                "file"
            };
            let name = trimmed.trim_end_matches('/').to_string();
            if name.is_empty() {
                return None;
            }
            eprintln!("Parsing entry: '{}' -> name: '{}', kind: '{}'", trimmed, name, kind);
            Some(RemoteEntry {
                name,
                kind: kind.into(),
            })
        })
        .collect();
    
    eprintln!("Total entries parsed: {}", entries.len());
    
    // Sort: directories first, then files, both alphabetically
    entries.sort_by(|a, b| {
        match (a.kind.as_str(), b.kind.as_str()) {
            ("directory", "file") => std::cmp::Ordering::Less,
            ("file", "directory") => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    entries
}


#[derive(Serialize)]
pub struct ConflictFile {
    pub path: String,
    pub kind: String, // "text" or "property"
}

#[tauri::command]
pub async fn get_conflicted_files(working_copy_path: String) -> Result<Vec<ConflictFile>, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Get status and filter for conflicted files
    let status_output = run_svn(&["status"], Some(&path)).await?;
    let mut conflicted_files = Vec::new();

    for line in status_output.lines() {
        if line.trim().is_empty() {
            continue;
        }

        // Check if line starts with 'C' (conflicted) or 'C ' (conflicted with property conflicts)
        if line.starts_with("C ") || line.starts_with("CC") {
            let file_path = if line.len() > 7 {
                line[7..].trim().to_string()
            } else {
                continue;
            };

            if file_path.is_empty() {
                continue;
            }

            // Determine conflict kind
            // 'C ' = text conflict, 'CC' = both text and property conflicts
            let kind = if line.starts_with("CC") {
                "both"
            } else {
                "text"
            };

            conflicted_files.push(ConflictFile {
                path: file_path,
                kind: kind.into(),
            });
        }
    }

    Ok(conflicted_files)
}

#[derive(Serialize)]
pub struct ConflictContent {
    pub mine: Option<String>,
    pub theirs: Option<String>,
    pub working: String,
    pub base: Option<String>,
}

#[tauri::command]
pub async fn get_conflict_content(
    working_copy_path: String,
    file_path: String,
) -> Result<ConflictContent, String> {
    let wc_path = PathBuf::from(&working_copy_path);
    if !wc_path.exists() {
        return Err("Working copy path does not exist".into());
    }

    let full_path = wc_path.join(&file_path);
    if !full_path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    // Read the working file (contains conflict markers)
    let working_content = std::fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read working file: {}", e))?;

    // Try to read .mine file (if exists)
    let mine_path = full_path.with_extension("mine");
    let mine_content = if mine_path.exists() {
        std::fs::read_to_string(&mine_path).ok()
    } else {
        None
    };

    // Try to read .theirs file (if exists)
    let theirs_path = full_path.with_extension("theirs");
    let theirs_content = if theirs_path.exists() {
        std::fs::read_to_string(&theirs_path).ok()
    } else {
        None
    };

    // Try to read .working file (if exists) - this is the base version
    let working_file_path = full_path.with_extension("working");
    let base_content = if working_file_path.exists() {
        std::fs::read_to_string(&working_file_path).ok()
    } else {
        None
    };

    Ok(ConflictContent {
        mine: mine_content,
        theirs: theirs_content,
        working: working_content,
        base: base_content,
    })
}

#[tauri::command]
pub async fn resolve_conflict(
    app: AppHandle,
    working_copy_path: String,
    file_path: String,
    accept: String, // "theirs-full", "mine-full", "working", "theirs-conflict", "mine-conflict"
) -> Result<String, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Validate accept parameter
    let valid_accepts = [
        "theirs-full",
        "mine-full",
        "working",
        "theirs-conflict",
        "mine-conflict",
    ];
    if !valid_accepts.contains(&accept.as_str()) {
        return Err(format!(
            "Invalid accept value. Must be one of: {}",
            valid_accepts.join(", ")
        ));
    }

    // Run svn resolve
    let mut cmd = Command::new("svn");
    cmd.arg("resolve");
    cmd.arg("--accept");
    cmd.arg(&accept);
    cmd.arg(&file_path);
    cmd.current_dir(&path);

    let output = cmd.output().await.map_err(|e| {
        format!("Failed to execute svn resolve: {}", e)
    })?;

    // Stream output
    if !output.stdout.is_empty() {
        let stdout_msg = String::from_utf8_lossy(&output.stdout);
        app.emit("svn-output", format!("$ svn resolve --accept {} {}\n{}", accept, file_path, stdout_msg))
            .ok();
    }

    if !output.stderr.is_empty() {
        let stderr_msg = String::from_utf8_lossy(&output.stderr);
        app.emit("svn-output", format!("{}\n", stderr_msg)).ok();
    }

    if !output.status.success() {
        let error_msg = if !output.stderr.is_empty() {
            String::from_utf8_lossy(&output.stderr).to_string()
        } else if !output.stdout.is_empty() {
            String::from_utf8_lossy(&output.stdout).to_string()
        } else {
            format!("svn resolve failed with exit code: {:?}", output.status.code())
        };
        return Err(format!("Failed to resolve conflict: {}", error_msg));
    }

    Ok(format!("Conflict resolved successfully for {}", file_path))
}

#[derive(Serialize)]
pub struct BranchTag {
    pub name: String,
    pub kind: String, // "branch", "tag", or "trunk"
    pub url: String,
    pub revision: String,
}

#[tauri::command]
pub async fn list_branches_tags(working_copy_path: String) -> Result<Vec<BranchTag>, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Get repository root URL
    let repo_root = get_repository_root_url(working_copy_path.clone()).await?;
    
    // List branches and tags
    let branches_url = format!("{}/branches", repo_root.trim_end_matches('/'));
    let tags_url = format!("{}/tags", repo_root.trim_end_matches('/'));
    let trunk_url = format!("{}/trunk", repo_root.trim_end_matches('/'));

    let mut branches_tags = Vec::new();

    // Check if trunk exists
    let trunk_output = run_svn(&["list", &trunk_url], None).await.ok();
    if trunk_output.is_some() {
        let trunk_rev = get_latest_revision(&trunk_url).await.unwrap_or_else(|_| "?".to_string());
        branches_tags.push(BranchTag {
            name: "trunk".to_string(),
            kind: "trunk".into(),
            url: trunk_url,
            revision: trunk_rev,
        });
    }

    // List branches
    if let Ok(branches_output) = run_svn(&["list", &branches_url], None).await {
        for line in branches_output.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || !trimmed.ends_with('/') {
                continue;
            }
            let branch_name = trimmed.trim_end_matches('/').to_string();
            if branch_name.is_empty() {
                continue;
            }
            let branch_url = format!("{}/{}", branches_url, branch_name);
            let branch_rev = get_latest_revision(&branch_url).await.unwrap_or_else(|_| "?".to_string());
            branches_tags.push(BranchTag {
                name: branch_name,
                kind: "branch".into(),
                url: branch_url,
                revision: branch_rev,
            });
        }
    }

    // List tags
    if let Ok(tags_output) = run_svn(&["list", &tags_url], None).await {
        for line in tags_output.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || !trimmed.ends_with('/') {
                continue;
            }
            let tag_name = trimmed.trim_end_matches('/').to_string();
            if tag_name.is_empty() {
                continue;
            }
            let tag_url = format!("{}/{}", tags_url, tag_name);
            let tag_rev = get_latest_revision(&tag_url).await.unwrap_or_else(|_| "?".to_string());
            branches_tags.push(BranchTag {
                name: tag_name,
                kind: "tag".into(),
                url: tag_url,
                revision: tag_rev,
            });
        }
    }

    // Sort: trunk first, then branches, then tags, all alphabetically
    branches_tags.sort_by(|a, b| {
        match (a.kind.as_str(), b.kind.as_str()) {
            ("trunk", _) => std::cmp::Ordering::Less,
            (_, "trunk") => std::cmp::Ordering::Greater,
            ("branch", "tag") => std::cmp::Ordering::Less,
            ("tag", "branch") => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });

    Ok(branches_tags)
}

async fn get_latest_revision(url: &str) -> Result<String, String> {
    let output = run_svn(&["info", "--show-item", "revision", url], None).await?;
    Ok(output.trim().to_string())
}

#[tauri::command]
pub async fn switch_branch(
    app: AppHandle,
    working_copy_path: String,
    branch_url: String,
) -> Result<String, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Run svn switch
    let mut cmd = Command::new("svn");
    cmd.arg("switch");
    cmd.arg(&branch_url);
    cmd.current_dir(&path);

    let output = cmd.output().await.map_err(|e| {
        format!("Failed to execute svn switch: {}", e)
    })?;

    // Stream output
    if !output.stdout.is_empty() {
        let stdout_msg = String::from_utf8_lossy(&output.stdout);
        app.emit("svn-output", format!("$ svn switch {}\n{}", branch_url, stdout_msg))
            .ok();
    }

    if !output.stderr.is_empty() {
        let stderr_msg = String::from_utf8_lossy(&output.stderr);
        app.emit("svn-output", format!("{}\n", stderr_msg)).ok();
    }

    if !output.status.success() {
        let error_msg = if !output.stderr.is_empty() {
            String::from_utf8_lossy(&output.stderr).to_string()
        } else if !output.stdout.is_empty() {
            String::from_utf8_lossy(&output.stdout).to_string()
        } else {
            format!("svn switch failed with exit code: {:?}", output.status.code())
        };
        return Err(format!("Failed to switch branch: {}", error_msg));
    }

    Ok(format!("Successfully switched to {}", branch_url))
}

#[tauri::command]
pub async fn copy_file_in_svn(
    app: AppHandle,
    working_copy_path: String,
    source_path: String,
    destination_path: String,
) -> Result<String, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    // Validate paths
    if source_path.is_empty() {
        return Err("Source path cannot be empty".into());
    }
    if destination_path.is_empty() {
        return Err("Destination path cannot be empty".into());
    }

    // Run svn copy
    let mut cmd = Command::new("svn");
    cmd.arg("copy");
    cmd.arg(&source_path);
    cmd.arg(&destination_path);
    cmd.current_dir(&path);

    let output = cmd.output().await.map_err(|e| {
        format!("Failed to execute svn copy: {}", e)
    })?;

    // Stream output
    if !output.stdout.is_empty() {
        let stdout_msg = String::from_utf8_lossy(&output.stdout);
        app.emit("svn-output", format!("$ svn copy {} {}\n{}", source_path, destination_path, stdout_msg))
            .ok();
    }

    if !output.stderr.is_empty() {
        let stderr_msg = String::from_utf8_lossy(&output.stderr);
        app.emit("svn-output", format!("{}\n", stderr_msg)).ok();
    }

    if !output.status.success() {
        let error_msg = if !output.stderr.is_empty() {
            String::from_utf8_lossy(&output.stderr).to_string()
        } else if !output.stdout.is_empty() {
            String::from_utf8_lossy(&output.stdout).to_string()
        } else {
            format!("svn copy failed with exit code: {:?}", output.status.code())
        };
        return Err(format!("Failed to copy file: {}", error_msg));
    }

    Ok(format!("Successfully copied {} to {}", source_path, destination_path))
}

#[tauri::command]
pub async fn create_branch_or_tag(
    app: AppHandle,
    working_copy_path: String,
    name: String,
    kind: String, // "branch" or "tag"
    source_path: Option<String>, // Optional source path (defaults to current path or trunk)
) -> Result<String, String> {
    let path = PathBuf::from(&working_copy_path);
    if !path.exists() {
        return Err("Working copy path does not exist".into());
    }

    if name.trim().is_empty() {
        return Err("Branch/tag name cannot be empty".into());
    }

    // Get repository root URL
    let repo_root = get_repository_root_url(working_copy_path.clone()).await?;
    
    // Determine source path
    let source = if let Some(src) = source_path {
        if src.starts_with("http://") || src.starts_with("https://") || src.starts_with("svn://") {
            src
        } else {
            // Relative path - construct full URL
            format!("{}/{}", repo_root.trim_end_matches('/'), src.trim_start_matches('/'))
        }
    } else {
        // Default to trunk or current working copy URL
        let current_url = run_svn(&["info", "--show-item", "url"], Some(&path)).await?;
        current_url.trim().to_string()
    };

    // Determine destination URL
    let dest_dir = if kind == "branch" {
        "branches"
    } else {
        "tags"
    };
    let destination = format!("{}/{}", repo_root.trim_end_matches('/'), dest_dir);
    let dest_url = format!("{}/{}", destination, name.trim());

    // Run svn copy to create branch/tag
    let mut cmd = Command::new("svn");
    cmd.arg("copy");
    cmd.arg(&source);
    cmd.arg(&dest_url);
    cmd.arg("-m");
    cmd.arg(&format!("Create {}: {}", kind, name));
    cmd.current_dir(&path);

    let output = cmd.output().await.map_err(|e| {
        format!("Failed to execute svn copy: {}", e)
    })?;

    // Stream output
    if !output.stdout.is_empty() {
        let stdout_msg = String::from_utf8_lossy(&output.stdout);
        app.emit("svn-output", format!("$ svn copy {} {} -m \"Create {}: {}\"\n{}", source, dest_url, kind, name, stdout_msg))
            .ok();
    }

    if !output.stderr.is_empty() {
        let stderr_msg = String::from_utf8_lossy(&output.stderr);
        app.emit("svn-output", format!("{}\n", stderr_msg)).ok();
    }

    if !output.status.success() {
        let error_msg = if !output.stderr.is_empty() {
            String::from_utf8_lossy(&output.stderr).to_string()
        } else if !output.stdout.is_empty() {
            String::from_utf8_lossy(&output.stdout).to_string()
        } else {
            format!("svn copy failed with exit code: {:?}", output.status.code())
        };
        return Err(format!("Failed to create {}: {}", kind, error_msg));
    }

    Ok(format!("Successfully created {}: {}", kind, name))
}
