import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

interface Options {
  onResult: (transcript: string) => void;
  onError?: (msg: string) => void;
  lang?: string;
}

export function useSpeech({ onResult, onError, lang = "pt-BR" }: Options) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const finalRef = useRef("");
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const hasPermissionRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const listeningRef = useRef(false);
  const pendingStartRef = useRef(false);
  const suppressClientErrorRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

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
    const id = setInterval(() => {
      if (!startedAtRef.current) return;
      setRecordingDurationMs(Date.now() - startedAtRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [listening]);

  useSpeechRecognitionEvent("start", () => {
    pendingStartRef.current = false;
    startedAtRef.current = Date.now();
    setListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    pendingStartRef.current = false;
    setListening(false);
    const text = finalRef.current.trim();
    finalRef.current = "";
    onResultRef.current(text);
    startedAtRef.current = null;
    setRecordingDurationMs(0);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript ?? "";
    if (text) finalRef.current = text;
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted") {
      suppressClientErrorRef.current = false;
      return;
    }
    pendingStartRef.current = false;
    setListening(false);
    startedAtRef.current = null;
    setRecordingDurationMs(0);
    if (event.error === "client" && suppressClientErrorRef.current) {
      suppressClientErrorRef.current = false;
      return;
    }
    onErrorRef.current?.(event.message || event.error);
  });

  const start = useCallback(async () => {
    if (listeningRef.current || pendingStartRef.current) return;
    if (!hasPermissionRef.current) {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      hasPermissionRef.current = !!perm.granted;
      if (!perm.granted) {
        onErrorRef.current?.("Permissão de microfone negada.");
        return;
      }
    }
    try {
      finalRef.current = "";
      pendingStartRef.current = true;
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous: false,
      });
    } catch {
      pendingStartRef.current = false;
      onErrorRef.current?.("Não foi possível iniciar o microfone.");
    }
  }, [lang]);

  const stop = useCallback(() => {
    if (pendingStartRef.current) {
      suppressClientErrorRef.current = true;
      pendingStartRef.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // ignore
      }
      setListening(false);
      startedAtRef.current = null;
      setRecordingDurationMs(0);
      return;
    }
    if (!listeningRef.current) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
  }, []);

  const cancel = useCallback(() => {
    pendingStartRef.current = false;
    suppressClientErrorRef.current = false;
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
    startedAtRef.current = null;
    setRecordingDurationMs(0);
  }, []);

  return { supported, listening, recordingDurationMs, start, stop, cancel };
}
