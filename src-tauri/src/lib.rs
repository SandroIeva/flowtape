use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![store_audio, remove_stored_audio])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn store_audio(app: tauri::AppHandle, file_name: String, data_base64: String, collection: String) -> Result<String, String> {
  use base64::{engine::general_purpose, Engine as _};
  use std::{fs, path::Path, time::{SystemTime, UNIX_EPOCH}};

  let collection = if collection == "sounds" { "sounds" } else { "library" };
  let extension = Path::new(&file_name).extension().and_then(|value| value.to_str()).unwrap_or("audio");
  let stem = Path::new(&file_name).file_stem().and_then(|value| value.to_str()).unwrap_or("audio");
  let safe_stem: String = stem.chars().map(|character| if character.is_ascii_alphanumeric() { character } else { '-' }).collect();
  let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|error| error.to_string())?.as_millis();
  let directory = app.path().app_data_dir().map_err(|error| error.to_string())?.join("audio").join(collection);
  fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
  let path = directory.join(format!("{}-{}.{}", safe_stem.trim_matches('-'), timestamp, extension.to_ascii_lowercase()));
  let bytes = general_purpose::STANDARD.decode(data_base64).map_err(|error| error.to_string())?;
  fs::write(&path, bytes).map_err(|error| error.to_string())?;
  Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn remove_stored_audio(app: tauri::AppHandle, path: String) -> Result<(), String> {
  use std::{fs, path::PathBuf};

  let audio_root = app.path().app_data_dir().map_err(|error| error.to_string())?.join("audio");
  let file_path = PathBuf::from(path);
  if !file_path.starts_with(&audio_root) { return Err("Invalid audio path".into()); }
  if file_path.exists() { fs::remove_file(file_path).map_err(|error| error.to_string())?; }
  Ok(())
}
