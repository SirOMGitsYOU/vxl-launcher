#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VOXEL_NPM_TOKEN:-}" ]]; then
  echo "VOXEL_NPM_TOKEN is not set." >&2
  echo "Export your token, e.g.: export VOXEL_NPM_TOKEN=..." >&2
  exit 1
fi

NPMRC="${HOME}/.npmrc"
AUTH_LINE="//npm.voxelstudios.co.uk/:_authToken=${VOXEL_NPM_TOKEN}"
REGISTRY_HOST="//npm.voxelstudios.co.uk/"

if [[ -f "$NPMRC" ]] && grep -qF "$REGISTRY_HOST:_authToken=" "$NPMRC"; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' "s|^${REGISTRY_HOST}:_authToken=.*|${AUTH_LINE}|" "$NPMRC"
  else
    sed -i "s|^${REGISTRY_HOST}:_authToken=.*|${AUTH_LINE}|" "$NPMRC"
  fi
else
  printf '\n%s\n' "$AUTH_LINE" >> "$NPMRC"
fi

echo "Configured Voxel npm auth in ${NPMRC}"
