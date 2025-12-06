use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WorkingCopy {
    pub path: String,
    pub url: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Default)]
struct WorkingCopiesStorage {
    working_copies: Vec<WorkingCopy>,
}

const STORAGE_FILE: &str = "working-copies.json";

pub fn get_storage_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    fs::create_dir_all(&app_data).map_err(|e| format!("Failed to create app data directory: {}", e))?;
    Ok(app_data.join(STORAGE_FILE))
}

pub fn load_working_copies(app: &AppHandle) -> Result<Vec<WorkingCopy>, String> {
    let storage_path = get_storage_path(app)?;
    
    if !storage_path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&storage_path)
        .map_err(|e| format!("Failed to read storage file: {}", e))?;
    
    let storage: WorkingCopiesStorage = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse storage file: {}", e))?;
    
    Ok(storage.working_copies)
}

pub fn save_working_copies(app: &AppHandle, working_copies: Vec<WorkingCopy>) -> Result<(), String> {
    let storage_path = get_storage_path(app)?;
    let storage = WorkingCopiesStorage { working_copies };
    
    let content = serde_json::to_string_pretty(&storage)
        .map_err(|e| format!("Failed to serialize storage: {}", e))?;
    
    fs::write(&storage_path, content)
        .map_err(|e| format!("Failed to write storage file: {}", e))?;
    
    Ok(())
}

pub fn add_working_copy(app: &AppHandle, working_copy: WorkingCopy) -> Result<(), String> {
    let mut working_copies = load_working_copies(app)?;
    
    // Check if path already exists
    if working_copies.iter().any(|wc| wc.path == working_copy.path) {
        return Err(format!("Working copy at {} is already registered", working_copy.path));
    }
    
    working_copies.push(working_copy);
    save_working_copies(app, working_copies)
}

#[allow(dead_code)]
pub fn remove_working_copy(app: &AppHandle, path: &str) -> Result<(), String> {
    let mut working_copies = load_working_copies(app)?;
    working_copies.retain(|wc| wc.path != path);
    save_working_copies(app, working_copies)
}
