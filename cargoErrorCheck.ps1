cd src-tauri
cargo check 2>&1 |
    Select-String "error\[" |
    ForEach-Object {
        $start = $_.LineNumber - 3
        if ($start -lt 0) { $start = 0 }
        cargo check 2>&1 |
            Select-Object -Skip $start -First 15
    }