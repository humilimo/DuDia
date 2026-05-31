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

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

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
    startedAtRef.current = Date.now();
    setListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
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
    if (event.error === "aborted") return;
    setListening(false);
    startedAtRef.current = null;
    setRecordingDurationMs(0);
    onErrorRef.current?.(event.message || event.error);
  });

  const start = useCallback(async () => {
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
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous: false,
      });
    } catch {
      onErrorRef.current?.("Não foi possível iniciar o microfone.");
    }
  }, [lang]);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
    setListening(false);
    startedAtRef.current = null;
    setRecordingDurationMs(0);
  }, []);

  const cancel = useCallback(() => {
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
