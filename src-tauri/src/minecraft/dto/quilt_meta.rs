use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct QuiltVersion {
    pub version: String,
    #[serde(default)]
    pub stable: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuiltLoaderVersion {
    pub separator: String,
    pub build: i32,
    pub maven: String,
    pub version: String,
    #[serde(default)]
    pub stable: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuiltMappingsArtifact {
    pub maven: String,
    pub version: String,
    #[serde(default)]
    pub stable: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuiltInstallerVersion {
    pub url: String,
    pub maven: String,
    pub version: String,
    #[serde(default)]
    pub stable: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuiltVersionManifest {
    pub loader: QuiltLoaderVersion,
    pub installer: QuiltInstallerVersion,
}

pub type QuiltIntermediary = QuiltMappingsArtifact;
pub type QuiltHashed = QuiltMappingsArtifact;

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct QuiltLibrary {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub md5: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha1: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha512: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuiltLibraries {
    pub client: Vec<QuiltLibrary>,
    pub common: Vec<QuiltLibrary>,
    pub server: Vec<QuiltLibrary>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub development: Option<Vec<QuiltLibrary>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuiltMainClassObject {
    #[serde(rename = "client")]
    pub client: String,
    #[serde(rename = "server")]
    pub server: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum QuiltMainClass {
    String(String),
    Object(QuiltMainClassObject),
}

impl QuiltMainClass {
    pub fn get_client(&self) -> String {
        match self {
            QuiltMainClass::String(s) => s.clone(),
            QuiltMainClass::Object(o) => o.client.clone(),
        }
    }

    pub fn get_server(&self) -> String {
        match self {
            QuiltMainClass::String(s) => s.clone(),
            QuiltMainClass::Object(o) => o.server.clone(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuiltLauncherMeta {
    pub version: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_java_version: Option<i32>,
    pub libraries: QuiltLibraries,
    #[serde(rename = "mainClass")]
    pub main_class: QuiltMainClass,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuiltVersionInfo {
    pub loader: QuiltLoaderVersion,
    #[serde(default)]
    pub intermediary: Option<QuiltMappingsArtifact>,
    #[serde(default)]
    pub hashed: Option<QuiltMappingsArtifact>,
    #[serde(rename = "launcherMeta")]
    pub launcher_meta: QuiltLauncherMeta,
}

impl QuiltVersionInfo {
    /// Intermediary or hashed mappings artifact, depending on Quilt meta API version.
    pub fn mappings_artifact(&self) -> Option<&QuiltMappingsArtifact> {
        self.intermediary.as_ref().or(self.hashed.as_ref())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialize_quilt_loader_versions_for_snapshot_without_intermediary() {
        let json = r#"[
          {
            "loader": {
              "maven": "org.quiltmc:quilt-loader:0.20.0-beta.9",
              "version": "0.20.0-beta.9",
              "build": 9,
              "separator": "."
            },
            "launcherMeta": {
              "version": 1,
              "libraries": { "client": [], "common": [], "server": [] },
              "mainClass": {
                "client": "org.quiltmc.loader.impl.launch.knot.KnotClient",
                "server": "org.quiltmc.loader.impl.launch.knot.KnotServer",
                "serverLauncher": "org.quiltmc.loader.impl.launch.server.QuiltServerLauncher"
              }
            }
          }
        ]"#;

        let versions: Vec<QuiltVersionInfo> = serde_json::from_str(json).expect("parse quilt 26.x");
        assert_eq!(versions.len(), 1);
        assert_eq!(versions[0].loader.version, "0.20.0-beta.9");
        assert!(versions[0].intermediary.is_none());
        assert!(versions[0].hashed.is_none());
        assert!(versions[0].mappings_artifact().is_none());
    }

    #[test]
    fn deserialize_quilt_loader_versions_with_intermediary_and_hashed() {
        let json = r#"[
          {
            "loader": {
              "maven": "org.quiltmc:quilt-loader:0.20.0-beta.9",
              "version": "0.20.0-beta.9",
              "build": 9,
              "separator": "."
            },
            "hashed": {
              "maven": "org.quiltmc:hashed:1.21.4",
              "version": "1.21.4"
            },
            "intermediary": {
              "maven": "net.fabricmc:intermediary:1.21.4",
              "version": "1.21.4"
            },
            "launcherMeta": {
              "version": 1,
              "libraries": { "client": [], "common": [], "server": [] },
              "mainClass": {
                "client": "org.quiltmc.loader.impl.launch.knot.KnotClient",
                "server": "org.quiltmc.loader.impl.launch.knot.KnotServer"
              }
            }
          }
        ]"#;

        let versions: Vec<QuiltVersionInfo> = serde_json::from_str(json).expect("parse quilt 1.21.4");
        assert_eq!(
            versions[0].mappings_artifact().map(|m| m.maven.as_str()),
            Some("net.fabricmc:intermediary:1.21.4")
        );
    }
}
