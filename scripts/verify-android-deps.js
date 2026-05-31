/**
 * Pre-build check: no deprecated @react-native-voice (jcenter) in the tree.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const logPath = path.join(root, ".cursor/debug-217d83.log");

function agentLog(payload) {
  // #region agent log
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(
      logPath,
      `${JSON.stringify({
        sessionId: "217d83",
        timestamp: Date.now(),
        runId: process.env.DEBUG_RUN_ID || "verify-deps",
        ...payload,
      })}\n`,
    );
  } catch {
    /* ignore */
  }
  // #endregion
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const hasVoiceDep =
  "@react-native-voice/voice" in (pkg.dependencies || {}) ||
  "@react-native-voice/voice" in (pkg.devDependencies || {});
const hasExpoSpeech = "expo-speech-recognition" in (pkg.dependencies || {});
const voiceModulePath = path.join(
  root,
  "node_modules/@react-native-voice/voice/android/build.gradle",
);
const voiceModuleExists = fs.existsSync(voiceModulePath);
let voiceHasJcenter = false;
if (voiceModuleExists) {
  voiceHasJcenter = fs
    .readFileSync(voiceModulePath, "utf8")
    .includes("jcenter()");
}

agentLog({
  hypothesisId: "F",
  location: "verify-android-deps.js",
  message: "android dependency verification",
  data: {
    hasVoiceDep,
    hasExpoSpeech,
    voiceModuleExists,
    voiceHasJcenter,
  },
});

if (hasVoiceDep || voiceModuleExists) {
  console.error(
    "Remova @react-native-voice/voice e rode: npm install expo-speech-recognition",
  );
  process.exit(1);
}

if (!hasExpoSpeech) {
  console.error("Dependência expo-speech-recognition ausente.");
  process.exit(1);
}

console.log("Deps Android OK: expo-speech-recognition, sem @react-native-voice.");
