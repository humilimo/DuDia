#!/usr/bin/env bash
# Evita segfault do emulador com GPU host/Vulkan (NVIDIA + Intel no Linux).
# Uso: npm run emu   (deixe rodando; em outro terminal: npx expo run:android)
set -euo pipefail

if [[ -z "${ANDROID_HOME:-}" ]]; then
  echo "ANDROID_HOME não está definido."
  exit 1
fi

AVD="${ANDROID_AVD:-Medium_Phone_API_36.1}"
EMULATOR="${ANDROID_HOME}/emulator/emulator"

if ! "$EMULATOR" -list-avds | grep -qx "$AVD"; then
  echo "AVD não encontrado: $AVD"
  echo "AVDs disponíveis:"
  "$EMULATOR" -list-avds
  exit 1
fi

echo "Iniciando @$AVD com GPU swiftshader_indirect (evita crash Vulkan)..."
exec "$EMULATOR" "@${AVD}" -gpu swiftshader_indirect
