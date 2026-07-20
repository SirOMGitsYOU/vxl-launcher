use crate::error::{AppError, Result};
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use uuid::Uuid;

const SERVICE_NAME: &str = "com.vxl.VXLLauncher";
const DEVICE_TOKEN_KEY: &str = "device_token";
/// Windows Credential Manager blob limit (bytes).
const CREDENTIAL_BLOB_LIMIT: usize = 5120;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AccountSecrets {
    pub access_token: String,
    pub refresh_token: String,
}

fn map_keyring_error(context: &str, error: keyring::Error) -> AppError {
    AppError::AccountError(format!("{}: {}", context, error))
}

fn account_entry(account_id: Uuid) -> Result<Entry> {
    Entry::new(SERVICE_NAME, &format!("account:{}", account_id))
        .map_err(|e| map_keyring_error("Failed to create keyring entry", e))
}

fn account_access_entry(account_id: Uuid) -> Result<Entry> {
    Entry::new(SERVICE_NAME, &format!("account:{}:access", account_id))
        .map_err(|e| map_keyring_error("Failed to create access token keyring entry", e))
}

fn account_refresh_entry(account_id: Uuid) -> Result<Entry> {
    Entry::new(SERVICE_NAME, &format!("account:{}:refresh", account_id))
        .map_err(|e| map_keyring_error("Failed to create refresh token keyring entry", e))
}

fn device_token_entry() -> Result<Entry> {
    Entry::new(SERVICE_NAME, DEVICE_TOKEN_KEY)
        .map_err(|e| map_keyring_error("Failed to create device token keyring entry", e))
}

fn gzip_compress(data: &[u8]) -> Result<Vec<u8>> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::best());
    encoder
        .write_all(data)
        .map_err(|e| AppError::AccountError(format!("Failed to compress secret: {}", e)))?;
    encoder
        .finish()
        .map_err(|e| AppError::AccountError(format!("Failed to finalize compressed secret: {}", e)))
}

fn gzip_decompress(data: &[u8]) -> Result<Vec<u8>> {
    let mut decoder = GzDecoder::new(data);
    let mut out = Vec::new();
    decoder
        .read_to_end(&mut out)
        .map_err(|e| AppError::AccountError(format!("Failed to decompress secret: {}", e)))?;
    Ok(out)
}

fn is_gzip(data: &[u8]) -> bool {
    data.len() >= 2 && data[0] == 0x1f && data[1] == 0x8b
}

fn encode_secret_blob(value: &str) -> Result<Vec<u8>> {
    let bytes = value.as_bytes();
    if bytes.len() <= CREDENTIAL_BLOB_LIMIT {
        return Ok(bytes.to_vec());
    }

    let compressed = gzip_compress(bytes)?;
    if compressed.len() <= CREDENTIAL_BLOB_LIMIT {
        return Ok(compressed);
    }

    Err(AppError::AccountError(format!(
        "Secret exceeds platform storage limit ({} bytes compressed, max {} bytes)",
        compressed.len(),
        CREDENTIAL_BLOB_LIMIT
    )))
}

fn decode_secret_blob(blob: &[u8]) -> Result<String> {
    let bytes = if is_gzip(blob) {
        gzip_decompress(blob)?
    } else {
        blob.to_vec()
    };

    String::from_utf8(bytes)
        .map_err(|e| AppError::AccountError(format!("Stored secret is not valid UTF-8: {}", e)))
}

fn store_secret(entry: &Entry, value: &str) -> Result<()> {
    let blob = encode_secret_blob(value)?;
    entry
        .set_secret(&blob)
        .map_err(|e| map_keyring_error("Failed to store secret", e))
}

fn load_secret(entry: &Entry) -> Result<String> {
    let blob = entry
        .get_secret()
        .map_err(|e| map_keyring_error("Failed to load secret", e))?;
    decode_secret_blob(&blob)
}

fn delete_entry(entry: &Entry) -> Result<()> {
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(map_keyring_error("Failed to delete secret", e)),
    }
}

fn load_legacy_combined_secrets(account_id: Uuid) -> Result<Option<AccountSecrets>> {
    let entry = account_entry(account_id)?;

    match entry.get_password() {
        Ok(json) => {
            let secrets: AccountSecrets = serde_json::from_str(&json).map_err(|e| {
                AppError::AccountError(format!("Failed to parse legacy account secrets: {}", e))
            })?;
            return Ok(Some(secrets));
        }
        Err(keyring::Error::NoEntry) => {}
        Err(e) => {
            return Err(map_keyring_error("Failed to load legacy account secrets", e));
        }
    }

    match entry.get_secret() {
        Ok(blob) if blob.is_empty() => Ok(None),
        Ok(blob) => {
            let json = decode_secret_blob(&blob)?;
            let secrets: AccountSecrets = serde_json::from_str(&json).map_err(|e| {
                AppError::AccountError(format!("Failed to parse legacy account secrets: {}", e))
            })?;
            Ok(Some(secrets))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(map_keyring_error("Failed to load legacy account secrets", e)),
    }
}

pub fn store_account_secrets(account_id: Uuid, secrets: &AccountSecrets) -> Result<()> {
    store_secret(&account_access_entry(account_id)?, &secrets.access_token)?;
    store_secret(
        &account_refresh_entry(account_id)?,
        &secrets.refresh_token,
    )?;
    // Remove legacy combined entry after migrating to split storage.
    let _ = delete_entry(&account_entry(account_id)?);
    Ok(())
}

pub fn load_account_secrets(account_id: Uuid) -> Result<AccountSecrets> {
    let access_result = load_secret(&account_access_entry(account_id)?);
    let refresh_result = load_secret(&account_refresh_entry(account_id)?);

    if let (Ok(access_token), Ok(refresh_token)) = (access_result, refresh_result) {
        return Ok(AccountSecrets {
            access_token,
            refresh_token,
        });
    }

    if let Some(secrets) = load_legacy_combined_secrets(account_id)? {
        store_account_secrets(account_id, &secrets)?;
        return Ok(secrets);
    }

    Err(AppError::AccountError(
        "No stored account secrets found".to_string(),
    ))
}

pub fn delete_account_secrets(account_id: Uuid) -> Result<()> {
    delete_entry(&account_access_entry(account_id)?)?;
    delete_entry(&account_refresh_entry(account_id)?)?;
    delete_entry(&account_entry(account_id)?)?;
    Ok(())
}

pub fn store_device_token_json(json: &str) -> Result<()> {
    store_secret(&device_token_entry()?, json)
}

pub fn load_device_token_json() -> Result<Option<String>> {
    let entry = device_token_entry()?;

    match entry.get_secret() {
        Ok(blob) => Ok(Some(decode_secret_blob(&blob)?)),
        Err(keyring::Error::NoEntry) => match entry.get_password() {
            Ok(json) => {
                store_device_token_json(&json)?;
                Ok(Some(json))
            }
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(map_keyring_error("Failed to load device token", e)),
        },
        Err(e) => Err(map_keyring_error("Failed to load device token", e)),
    }
}

pub fn delete_device_token() -> Result<()> {
    delete_entry(&device_token_entry()?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gzip_roundtrip_preserves_token() {
        let token = "a".repeat(6000);
        let blob = encode_secret_blob(&token).expect("encode should gzip large token");
        assert!(is_gzip(&blob));
        let decoded = decode_secret_blob(&blob).expect("decode should succeed");
        assert_eq!(decoded, token);
    }

    #[test]
    fn small_token_stays_uncompressed() {
        let token = "short-token";
        let blob = encode_secret_blob(token).expect("encode should succeed");
        assert!(!is_gzip(&blob));
        assert_eq!(String::from_utf8(blob).unwrap(), token);
    }
}
