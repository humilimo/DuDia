import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

const MIN_RECORD_MS = 350;
const START_TIMEOUT_MS = 2000;
/** Avoid false "silêncio" quando o nativo emite `end` cedo sem transcrição consolidada. */
const MIN_MS_BEFORE_EMPTY_NOTIFY = 800;

const STT_UNAVAILABLE_MSG =
  "Reconhecimento de voz indisponível. Instale o app Google ou ative o reconhecimento de voz nas configurações do Android.";

interface Options {
  onResult: (transcript: string) => void;
  onError?: (msg: string) => void;
  onEmpty?: () => void;
  /** When false, native events are ignored so only the focused tab handles voice (tabs stay mounted). */
  enabled?: boolean;
  lang?: string;
}

function getAndroidSpeechServices(): string[] {
  if (Platform.OS !== "android") return [];
  const getServices = (
    ExpoSpeechRecognitionModule as {
      getSpeechRecognitionServices?: () => string[];
    }
  ).getSpeechRecognitionServices;
  if (typeof getServices !== "function") return [];
  try {
    return getServices.call(ExpoSpeechRecognitionModule) ?? [];
  } catch {
    return [];
  }
}

export function useSpeech({ onResult, onError, onEmpty, enabled = true, lang = "pt-BR" }: Options) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const finalRef = useRef("");
  const enabledRef = useRef(enabled);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onEmptyRef = useRef(onEmpty);
  const hasPermissionRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const sessionRef = useRef(0);
  const startingRef = useRef(false);
  const canStopAtRef = useRef(0);
  const pendingStopRef = useRef(false);
  const pendingCancelRef = useRef(false);
  const finalsPartsRef = useRef<string[]>([]);
  const skipEmptyOnNextEndRef = useRef(false);

  const pickLongestTranscript = useCallback((candidates: string[]) => {
    let best = "";
    for (const c of candidates) {
      const t = c.trim();
      if (t.length > best.length) best = t;
    }
    return best;
  }, []);

  const mergeFinalPart = useCallback((incoming: string) => {
    const t = incoming.trim();
    if (!t) return;
    const parts = finalsPartsRef.current;
    const last = parts[parts.length - 1];
    if (!last) {
      parts.push(t);
      return;
    }
    if (t.includes(last) || last.includes(t)) {
      parts[parts.length - 1] = t.length >= last.length ? t : last;
    } else {
      parts.push(t);
    }
  }, []);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    onEmptyRef.current = onEmpty;
  }, [onResult, onError, onEmpty]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (enabled) return;
    setListening(false);
    setIsStarting(false);
    setRecordingDurationMs(0);
    finalsPartsRef.current = [];
    finalRef.current = "";
    skipEmptyOnNextEndRef.current = false;
  }, [enabled]);

  useEffect(() => {
    try {
      setSupported(ExpoSpeechRecognitionModule.isRecognitionAvailable());
    } catch {
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void ExpoSpeechRecognitionModule.requestPermissionsAsync()
      .then((perm) => {
        if (!cancelled) hasPermissionRef.current = !!perm.granted;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [supported]);

  useEffect(() => {
    if (!listening) {
      setRecordingDurationMs(0);
      return;
    }

    const durationId = setInterval(() => {
      if (!startedAtRef.current) return;
      setRecordingDurationMs(Date.now() - startedAtRef.current);
    }, 100);

    return () => {
      clearInterval(durationId);
    };
  }, [listening]);

  const finishSession = useCallback(() => {
    startingRef.current = false;
    setIsStarting(false);
    pendingStopRef.current = false;
    pendingCancelRef.current = false;
    startedAtRef.current = null;
    canStopAtRef.current = 0;
    finalsPartsRef.current = [];
    setRecordingDurationMs(0);
  }, []);

  const tryStopOrCancel = useCallback(() => {
    const now = Date.now();
    if (now < canStopAtRef.current) {
      const delay = canStopAtRef.current - now;
      setTimeout(() => {
        if (pendingCancelRef.current) {
          pendingCancelRef.current = false;
          try {
            ExpoSpeechRecognitionModule.abort();
          } catch {
            try {
              ExpoSpeechRecognitionModule.stop();
            } catch {
              // ignore
            }
          }
          finalRef.current = "";
          setListening(false);
          finishSession();
        } else if (pendingStopRef.current) {
          pendingStopRef.current = false;
          try {
            ExpoSpeechRecognitionModule.stop();
          } catch {
            // ignore
          }
        }
      }, delay);
      return;
    }

    if (pendingCancelRef.current) {
      pendingCancelRef.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        try {
          ExpoSpeechRecognitionModule.stop();
        } catch {
          // ignore
        }
      }
      finalRef.current = "";
      setListening(false);
      finishSession();
      return;
    }

    if (pendingStopRef.current) {
      pendingStopRef.current = false;
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // ignore
      }
    }
  }, [finishSession]);

  useSpeechRecognitionEvent("start", () => {
    if (!enabledRef.current) return;
    skipEmptyOnNextEndRef.current = false;
    startingRef.current = false;
    setIsStarting(false);
    startedAtRef.current = Date.now();
    canStopAtRef.current = Date.now() + MIN_RECORD_MS;
    setListening(true);
    if (pendingStopRef.current || pendingCancelRef.current) {
      tryStopOrCancel();
    }
  });

  useSpeechRecognitionEvent("end", () => {
    if (!enabledRef.current) {
      finalRef.current = "";
      skipEmptyOnNextEndRef.current = false;
      return;
    }
    const startedAt = startedAtRef.current;
    const elapsedMs = startedAt ? Date.now() - startedAt : 0;
    const skipEmptyNotify = skipEmptyOnNextEndRef.current;
    skipEmptyOnNextEndRef.current = false;

    setListening(false);
    finishSession();
    const text = finalRef.current.trim();
    finalRef.current = "";
    if (text) {
      onResultRef.current(text);
    } else if (!skipEmptyNotify && elapsedMs >= MIN_MS_BEFORE_EMPTY_NOTIFY) {
      onEmptyRef.current?.();
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (!enabledRef.current) return;
    const results = event.results;
    if (!results?.length) return;

    const fromResults = results
      .map((r) => r.transcript?.trim() ?? "")
      .filter(Boolean);

    if (event.isFinal) {
      for (const t of fromResults) mergeFinalPart(t);
    }

    const joinedFinals = finalsPartsRef.current.join(" ").trim();
    const best = pickLongestTranscript([finalRef.current, joinedFinals, ...fromResults]);
    if (best) finalRef.current = best;
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted") return;
    if (!enabledRef.current) {
      finalRef.current = "";
      return;
    }
    setListening(false);
    finishSession();
    finalRef.current = "";
    onErrorRef.current?.(event.message || event.error);
  });

  const start = useCallback(async () => {
    if (!enabledRef.current) return;
    if (listening && startedAtRef.current) return;

    if (listening && !startedAtRef.current) {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // ignore
      }
      setListening(false);
      finishSession();
    }

    if (startingRef.current) return;

    let available = false;
    try {
      available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      available = false;
    }
    if (!available) {
      setSupported(false);
      onErrorRef.current?.(STT_UNAVAILABLE_MSG);
      return;
    }

    if (Platform.OS === "android") {
      const services = getAndroidSpeechServices();
      if (services.length === 0) {
        onErrorRef.current?.(STT_UNAVAILABLE_MSG);
        return;
      }
    }

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    startingRef.current = true;
    setIsStarting(true);
    pendingStopRef.current = false;
    pendingCancelRef.current = false;
    finalRef.current = "";
    finalsPartsRef.current = [];
    skipEmptyOnNextEndRef.current = false;

    if (!hasPermissionRef.current) {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      hasPermissionRef.current = !!perm.granted;
      if (!perm.granted) {
        if (sessionRef.current === session) {
          startingRef.current = false;
          setIsStarting(false);
          onErrorRef.current?.("Permissão de microfone negada.");
        }
        return;
      }
    }

    if (sessionRef.current !== session) return;

    try {
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        /** Sem limite artificial de “uma frase”; o utilizador encerra com soltar o microfone. */
        continuous: true,
      });
    } catch {
      if (sessionRef.current === session) {
        startingRef.current = false;
        setIsStarting(false);
        onErrorRef.current?.("Não foi possível iniciar o microfone.");
      }
      return;
    }

    setTimeout(() => {
      if (sessionRef.current !== session) return;
      if (!enabledRef.current) {
        startingRef.current = false;
        setIsStarting(false);
        return;
      }
      if (startingRef.current) {
        startingRef.current = false;
        setIsStarting(false);
        if (pendingStopRef.current || pendingCancelRef.current) {
          tryStopOrCancel();
        }
      }
    }, START_TIMEOUT_MS);
  }, [lang, listening, tryStopOrCancel, finishSession]);

  const stop = useCallback(() => {
    if (startingRef.current && !listening) {
      pendingStopRef.current = true;
      return;
    }
    if (!listening && !startingRef.current) return;

    pendingStopRef.current = true;
    pendingCancelRef.current = false;
    tryStopOrCancel();
  }, [listening, tryStopOrCancel]);

  const cancel = useCallback(() => {
    skipEmptyOnNextEndRef.current = true;
    sessionRef.current += 1;
    pendingCancelRef.current = true;
    pendingStopRef.current = false;

    if (startingRef.current && !listening) {
      startingRef.current = false;
      setIsStarting(false);
      finishSession();
      return;
    }

    if (!listening && !startingRef.current) {
      finishSession();
      return;
    }

    tryStopOrCancel();
  }, [listening, tryStopOrCancel, finishSession]);

  return { supported, listening, isStarting, recordingDurationMs, start, stop, cancel };
}
