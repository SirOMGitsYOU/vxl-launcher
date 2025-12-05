cd src-tauri
$cargo = cargo check 2>&1
for ($i = 0; $i -lt $cargo.Count; $i++) {
    if ($cargo[$i] -match "^error\[") {
        $cargo[$i]
        if ($i + 1 -lt $cargo.Count) {
            $cargo[$i + 1]   # print the line below the error
        }
    }
}
cd ../