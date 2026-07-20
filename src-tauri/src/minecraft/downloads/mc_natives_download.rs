use crate::config::{ProjectDirsExt, LAUNCHER_DIRECTORY};
use crate::error::{AppError, Result};
use crate::minecraft::dto::piston_meta::{
    ArgumentValue, DownloadInfo, GameArgument, Library,
};
use crate::utils::system_info::{Architecture, ARCHITECTURE, OS};
use async_zip::tokio::read::seek::ZipFileReader;
use log::info;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tokio::fs;
use tokio::io::{AsyncWriteExt, BufReader};

const NATIVES_DIR: &str = "natives";
const SUBDIRECTORY_NATIVE_SUBFOLDERS: &[&str] = &["java", "jna", "lwjgl", "netty"];

pub struct MinecraftNativesDownloadService {
    base_path: PathBuf,
}

impl MinecraftNativesDownloadService {
    pub fn new() -> Self {
        let base_path = LAUNCHER_DIRECTORY.meta_dir().join(NATIVES_DIR);
        Self { base_path }
    }

    pub async fn extract_natives(
        &self,
        libraries: &[Library],
        version_id: &str,
        use_subdirectory_layout: bool,
    ) -> Result<()> {
        info!("Extracting natives...");

        // Create version-specific natives directory
        let natives_path = self.base_path.join(version_id);

        // Clean natives directory if possible, but don't fail if we can't (might be in use by another instance)
        if natives_path.exists() {
            match fs::remove_dir_all(&natives_path).await {
                Ok(_) => {
                    // Successfully removed, now create it again
                    match fs::create_dir_all(&natives_path).await {
                        Ok(_) => info!("Created fresh natives directory at {:?}", natives_path),
                        Err(e) => {
                            info!("Could not create natives directory after deletion: {}. Will try to use existing directory.", e);
                            // If we can't create it, another process might have created it already
                            if !natives_path.exists() {
                                return Err(AppError::Io(e));
                            }
                        }
                    }
                }
                Err(e) => {
                    info!("Could not clean natives directory: {}. Will try to use existing directory.", e);
                    // Continue with existing directory
                }
            }
        } else {
            // Directory doesn't exist, try to create it
            match fs::create_dir_all(&natives_path).await {
                Ok(_) => info!("Created natives directory at {:?}", natives_path),
                Err(e) => {
                    info!("Could not create natives directory: {}. Will try to use existing directory if it exists now.", e);
                    // If we can't create it, another process might have created it already
                    if !natives_path.exists() {
                        return Err(AppError::Io(e));
                    }
                }
            }
        }

        if use_subdirectory_layout {
            info!("Detected subdirectory native layout (26.2+ style)");
            for subfolder in SUBDIRECTORY_NATIVE_SUBFOLDERS {
                fs::create_dir_all(natives_path.join(subfolder)).await?;
            }
        }

        let os = OS
            .get_simple_name()
            .map_err(|e| AppError::Download(e.to_string()))?;

        info!(
            "Looking for natives for OS: {} and arch: {}",
            os,
            ARCHITECTURE.get_simple_name().unwrap_or("unknown")
        );

        // Try old method first
        self.extract_old_natives(libraries, os, &natives_path, use_subdirectory_layout)
            .await?;

        // Then try new method
        self.extract_new_natives(libraries, os, &natives_path, use_subdirectory_layout)
            .await?;

        info!("\nNative extraction completed!");
        Ok(())
    }

    async fn extract_old_natives(
        &self,
        libraries: &[Library],
        os: &str,
        natives_path: &PathBuf,
        use_subdirectory_layout: bool,
    ) -> Result<()> {
        info!("\nStarting old natives detection method...");

        for library in libraries {
            info!("\nChecking library: {}", library.name);

            if let Some(natives) = &library.natives {
                info!("  Found natives field: {:?}", natives);
                if let Some(classifier) = natives.get(os) {
                    info!("    Found classifier for {}: {}", os, classifier);
                    let classifier =
                        classifier.replace("${arch}", native_arch_replacement());
                    info!("    Resolved classifier: {}", classifier);

                    if let Some(classifiers) = &library.downloads.classifiers {
                        if let Some(native_info) = classifiers.get(&classifier) {
                            info!("    Found native artifact: {}", native_info.url);
                            info!("      Size: {} bytes", native_info.size);
                            info!("      SHA1: {}", native_info.sha1);
                            info!("      Extracting...");
                            self.extract_native_archive(
                                native_info,
                                natives_path,
                                library,
                                use_subdirectory_layout,
                            )
                            .await?;
                        } else {
                            info!(
                                "    No native artifact found for classifier: {}",
                                classifier
                            );
                        }
                    } else {
                        info!("    No classifiers found in downloads");
                    }
                } else {
                    info!("    No classifier found for OS: {}", os);
                }
            } else {
                info!("  No natives field found");
            }
        }

        info!("\nOld natives detection completed!");
        Ok(())
    }

    async fn extract_new_natives(
        &self,
        libraries: &[Library],
        os: &str,
        natives_path: &PathBuf,
        use_subdirectory_layout: bool,
    ) -> Result<()> {
        info!("\nStarting new natives detection method...");

        for library in libraries {
            info!("\nChecking library: {}", library.name);

            let native_patterns = native_suffix_patterns(os);

            info!("  Checking patterns: {:?}", native_patterns);
            for pattern in &native_patterns {
                if library.name.ends_with(pattern) {
                    info!("    Found match with pattern: {}", pattern);
                    if let Some(artifact) = &library.downloads.artifact {
                        info!("      Found artifact: {}", artifact.url);
                        info!("      Size: {} bytes", artifact.size);
                        info!("      SHA1: {}", artifact.sha1);
                        info!("      Extracting...");
                        self.extract_native_archive(
                            artifact,
                            natives_path,
                            library,
                            use_subdirectory_layout,
                        )
                        .await?;
                    } else {
                        info!("      No artifact found");
                    }
                }
            }
        }

        info!("\nNew natives detection completed!");
        Ok(())
    }

    async fn extract_native_archive(
        &self,
        native: &DownloadInfo,
        natives_path: &PathBuf,
        library: &Library,
        use_subdirectory_layout: bool,
    ) -> Result<()> {
        let target_path = self.get_library_path(native);

        // Read the zip file content
        let file_content = fs::read(&target_path).await?;
        let cursor = Cursor::new(file_content);
        let mut reader = BufReader::new(cursor);

        let mut zip = ZipFileReader::with_tokio(&mut reader)
            .await
            .map_err(|e| AppError::Download(e.to_string()))?;

        // Extract exclude patterns if any
        let exclude_patterns = if let Some(extract) = &library.extract {
            extract.exclude.clone().unwrap_or_default()
        } else {
            // Default behavior - if no extract.exclude specified, we don't exclude anything
            Vec::new()
        };

        info!("    Using exclude patterns: {:?}", exclude_patterns);

        for index in 0..zip.file().entries().len() {
            let entry = &zip.file().entries().get(index).unwrap();
            let file_name = entry
                .filename()
                .as_str()
                .map_err(|e| AppError::Download(e.to_string()))?;

            info!("  Extracting file: {}", file_name);

            // Check if file should be excluded
            let should_exclude = !exclude_patterns.is_empty()
                && exclude_patterns
                    .iter()
                    .any(|pattern| file_name.starts_with(pattern));

            if should_exclude {
                info!("    Skipping excluded entry: {}", file_name);
                continue;
            }

            let entry_is_dir = file_name.ends_with('/');

            if use_subdirectory_layout {
                if entry_is_dir || !is_native_binary(file_name) {
                    continue;
                }

                let file_name = native_file_basename(file_name);
                let target_subdirs = native_target_subdirs(&library.name);
                let mut entry_reader = match zip.reader_with_entry(index).await {
                    Ok(reader) => reader,
                    Err(e) => {
                        info!("    Error getting reader for entry: {}. Skipping file.", e);
                        continue;
                    }
                };

                let mut buffer = Vec::new();
                match entry_reader.read_to_end_checked(&mut buffer).await {
                    Ok(_) => {}
                    Err(e) => {
                        info!("    Error reading entry content: {}. Skipping file.", e);
                        continue;
                    }
                };

                for subdir in target_subdirs {
                    let path = natives_path.join(subdir).join(&file_name);
                    self.write_native_file(&path, &buffer).await;
                }
                continue;
            }

            let path = natives_path.join(file_name);

            if entry_is_dir {
                if !fs::try_exists(&path).await? {
                    match fs::create_dir_all(&path).await {
                        Ok(_) => info!("    Created directory: {:?}", path),
                        Err(e) => {
                            info!("    Error creating directory {:?}: {}. Directory might be in use by another instance.", path, e);
                            // Continue with next file
                        }
                    }
                }
            } else {
                // Create parent directories if they don't exist
                if let Some(parent) = path.parent() {
                    if !fs::try_exists(parent).await? {
                        match fs::create_dir_all(parent).await {
                            Ok(_) => {}
                            Err(e) => {
                                info!("    Error creating parent directory {:?}: {}. Directory might be in use by another instance.", parent, e);
                                // Continue with next file, but the file creation will likely fail too
                            }
                        }
                    }
                }

                let mut entry_reader = match zip.reader_with_entry(index).await {
                    Ok(reader) => reader,
                    Err(e) => {
                        info!("    Error getting reader for entry: {}. Skipping file.", e);
                        continue;
                    }
                };

                // Read the entry content into a buffer
                let mut buffer = Vec::new();
                match entry_reader.read_to_end_checked(&mut buffer).await {
                    Ok(_) => {}
                    Err(e) => {
                        info!("    Error reading entry content: {}. Skipping file.", e);
                        continue;
                    }
                };

                self.write_native_file(&path, &buffer).await;
            }
        }

        Ok(())
    }

    async fn write_native_file(&self, path: &Path, buffer: &[u8]) {
        if let Some(parent) = path.parent() {
            if let Err(e) = fs::create_dir_all(parent).await {
                info!(
                    "    Error creating parent directory {:?}: {}. Directory might be in use by another instance.",
                    parent, e
                );
                return;
            }
        }

        match fs::File::create(path).await {
            Ok(mut writer) => match writer.write_all(buffer).await {
                Ok(_) => info!("    Extracted file to: {:?}", path),
                Err(e) => {
                    info!(
                        "    Error writing to file {:?}: {}. File might be in use by another instance.",
                        path, e
                    );
                }
            },
            Err(e) => {
                info!(
                    "    Error creating file {:?}: {}. File might be in use by another instance.",
                    path, e
                );
            }
        }
    }

    fn get_library_path(&self, download_info: &DownloadInfo) -> PathBuf {
        let url = &download_info.url;
        let path = url
            .split("libraries.minecraft.net/")
            .nth(1)
            .expect("Invalid library URL");

        LAUNCHER_DIRECTORY.meta_dir().join("libraries").join(path)
    }
}

fn native_arch_replacement() -> &'static str {
    match ARCHITECTURE {
        Architecture::X64 => "64",
        Architecture::X86 => "32",
        Architecture::AARCH64 | Architecture::ARM => "arm64",
        Architecture::UNKNOWN => "64",
    }
}

fn native_suffix_patterns(os: &str) -> Vec<String> {
    match os {
        "windows" => match ARCHITECTURE {
            Architecture::AARCH64 => vec![
                ":natives-windows-arm64".to_string(),
                ":natives-windows".to_string(),
            ],
            Architecture::X86 => vec![
                ":natives-windows-x86".to_string(),
                ":natives-windows".to_string(),
            ],
            Architecture::X64 | Architecture::ARM | Architecture::UNKNOWN => {
                vec![":natives-windows".to_string()]
            }
        },
        "osx" => match ARCHITECTURE {
            Architecture::AARCH64 => vec![
                ":natives-macos-arm64".to_string(),
                ":natives-macos".to_string(),
            ],
            _ => vec![":natives-macos".to_string()],
        },
        _ => vec![format!(":natives-{}", os)],
    }
}

pub fn uses_subdirectory_native_layout_from_jvm_args(jvm_args: &[GameArgument]) -> bool {
    jvm_args
        .iter()
        .any(jvm_argument_mentions_subdirectory_natives)
}

fn jvm_argument_mentions_subdirectory_natives(arg: &GameArgument) -> bool {
    match arg {
        GameArgument::Simple(value) => value.contains("${natives_directory}/"),
        GameArgument::Complex(complex) => match &complex.value {
            ArgumentValue::Single(value) => value.contains("${natives_directory}/"),
            ArgumentValue::Multiple(values) => values
                .iter()
                .any(|value| value.contains("${natives_directory}/")),
        },
    }
}

fn native_target_subdirs(library_name: &str) -> Vec<&'static str> {
    if library_name.contains("jtracy") {
        return vec!["java"];
    }

    let parts: Vec<&str> = library_name.split(':').collect();
    if parts.len() >= 2 {
        let artifact = parts[1];
        if artifact == "lwjgl" {
            return vec!["java", "lwjgl"];
        }
        if artifact.starts_with("lwjgl") {
            return vec!["lwjgl"];
        }
        if artifact.contains("jna") {
            return vec!["jna"];
        }
        if artifact.contains("netty") {
            return vec!["netty"];
        }
    }

    vec!["java"]
}

fn is_native_binary(file_name: &str) -> bool {
    let normalized = file_name.trim_end_matches('/');
    let Some(file_name) = Path::new(normalized).file_name().and_then(|name| name.to_str()) else {
        return false;
    };

    let lower = file_name.to_lowercase();
    (lower.ends_with(".dll")
        || lower.ends_with(".so")
        || lower.ends_with(".dylib")
        || lower.ends_with(".jnilib"))
        && !lower.ends_with(".sha1")
        && !lower.ends_with(".git")
}

fn native_file_basename(file_name: &str) -> String {
    Path::new(file_name.trim_end_matches('/'))
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(file_name)
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::minecraft::dto::piston_meta::{ArgumentValue, ComplexArgument, Rule};

    #[test]
    fn detects_subdirectory_layout_from_jvm_args_with_subfolders() {
        let jvm_args = vec![GameArgument::Simple(
            "-Djava.library.path=${natives_directory}/java".to_string(),
        )];

        assert!(uses_subdirectory_native_layout_from_jvm_args(&jvm_args));
    }

    #[test]
    fn flat_natives_directory_does_not_use_subdirectory_layout() {
        let jvm_args = vec![GameArgument::Simple(
            "-Djava.library.path=${natives_directory}".to_string(),
        )];

        assert!(!uses_subdirectory_native_layout_from_jvm_args(&jvm_args));
    }

    #[test]
    fn detects_subdirectory_layout_in_complex_jvm_args() {
        let jvm_args = vec![GameArgument::Complex(ComplexArgument {
            rules: vec![Rule {
                action: "allow".to_string(),
                features: None,
                os: None,
            }],
            value: ArgumentValue::Multiple(vec![
                "-Dorg.lwjgl.system.SharedLibraryExtractPath=${natives_directory}/lwjgl"
                    .to_string(),
                "-Djava.library.path=${natives_directory}/java".to_string(),
            ]),
        })];

        assert!(uses_subdirectory_native_layout_from_jvm_args(&jvm_args));
    }

    #[test]
    fn maps_lwjgl_core_to_java_and_lwjgl_directories() {
        assert_eq!(
            native_target_subdirs("org.lwjgl:lwjgl:3.4.1:natives-windows"),
            vec!["java", "lwjgl"]
        );
    }

    #[test]
    fn maps_lwjgl_modules_to_lwjgl_directory() {
        assert_eq!(
            native_target_subdirs("org.lwjgl:lwjgl-glfw:3.4.1:natives-windows"),
            vec!["lwjgl"]
        );
    }

    #[test]
    fn maps_jtracy_to_java_directory() {
        assert_eq!(
            native_target_subdirs("com.mojang:jtracy:1.0.37:natives-windows"),
            vec!["java"]
        );
    }

    #[test]
    fn recognizes_native_binaries_and_ignores_metadata_files() {
        assert!(is_native_binary("windows/x64/org/lwjgl/lwjgl.dll"));
        assert!(is_native_binary("jtracy-jni-windows.dll"));
        assert!(!is_native_binary("META-INF/windows/x64/org/lwjgl/lwjgl.dll.sha1"));
        assert!(!is_native_binary("META-INF/MANIFEST.MF"));
    }

    #[test]
    fn extracts_native_file_basename_from_nested_paths() {
        assert_eq!(
            native_file_basename("windows/x64/org/lwjgl/glfw/glfw.dll"),
            "glfw.dll"
        );
    }

    #[test]
    fn x64_windows_does_not_match_x86_native_suffix() {
        assert_eq!(
            native_suffix_patterns("windows"),
            vec![":natives-windows".to_string()]
        );
    }

    #[test]
    fn x64_uses_64_for_legacy_arch_placeholder() {
        assert_eq!(native_arch_replacement(), "64");
    }
}
