// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod svn;
mod storage;

#[cfg(test)]
mod svn_tests;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Apply OS-level rounded corners for Windows 11
            #[cfg(target_os = "windows")]
            {
                use windows::Win32::Graphics::Dwm::*;
                use windows::Win32::Foundation::HWND;

                if let Some(window) = app.get_webview_window("main") {
                    // Get native HWND
                    if let Ok(hwnd) = window.hwnd() {
                        let hwnd = HWND(hwnd.0);
                        
                        // Apply rounded corners using DWM
                        // DWMWCP_ROUND = 2
                        let corner_preference = DWM_WINDOW_CORNER_PREFERENCE(2);
                        unsafe {
                            DwmSetWindowAttribute(
                                hwnd,
                                DWMWA_WINDOW_CORNER_PREFERENCE,
                                &corner_preference as *const _ as *const _,
                                std::mem::size_of_val(&corner_preference) as u32,
                            ).ok();
                        }
                    }
                }
            }

            // macOS: Borderless windows automatically have rounded corners
            // The CSS handles the visual appearance and content clipping
            // No additional Rust code needed for macOS rounded corners

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            svn::list_repositories,
            svn::get_svn_status,
            svn::list_remote_entries,
            svn::get_remote_file_content,
            svn::checkout_remote,
            svn::register_working_copy,
            svn::unregister_working_copy,
            svn::open_folder_dialog,
            svn::update_working_copy,
            svn::get_file_diff,
            svn::get_file_content,
            svn::get_file_content_at_revision,
            svn::get_revision_diff,
            svn::commit_working_copy,
            svn::add_files_to_svn,
            svn::delete_files_from_svn,
            svn::move_file_in_svn,
            svn::get_repository_root_url,
            svn::inspect_repository,
            svn::get_commit_history,
            svn::revert_to_revision,
            svn::export_revision,
            svn::get_file_blame,
            svn::save_file_from_revision,
            svn::compare_revisions,
            svn::get_repository_url_for_revision,
            svn::save_file_dialog,
            svn::merge_revisions,
            svn::get_conflicted_files,
            svn::get_conflict_content,
            svn::resolve_conflict,
            svn::list_branches_tags,
            svn::switch_branch,
            svn::copy_file_in_svn,
            svn::create_branch_or_tag
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
