"use client";

import { useEffect, useRef, useState } from "react";

type Screen = "select" | "game";
type Theme = "light" | "dark";

export type Track = {
  id: string;
  title: string;
  src: string;
  targetTime: number;
  description?: string;
};

type Result = {
  status: "fast" | "slow" | "too-slow" | "perfect";
  deltaMs: number | null;
  message: string;
};

const SLOW_LIMIT_MS = 50;
const PERFECT_EARLY_LIMIT_MS = -75;

type GameClientProps = {
  tracks: Track[];
};

export default function GameClient({ tracks }: GameClientProps) {
  const [screen, setScreen] = useState<Screen>("select");
  const [theme, setTheme] = useState<Theme>("light");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [round, setRound] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tooSlowTriggeredRef = useRef(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: Theme =
      savedTheme === "dark" || savedTheme === "light" ? savedTheme : prefersDark ? "dark" : "light";
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const startTrack = (track: Track) => {
    setSelectedTrack(track);
    setResult(null);
    setAudioError(null);
    tooSlowTriggeredRef.current = false;
    setRound((prev) => prev + 1);
    setScreen("game");
  };

  const resetToSelect = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setScreen("select");
    setSelectedTrack(null);
    setResult(null);
    setAudioError(null);
    tooSlowTriggeredRef.current = false;
  };

  const replayTrack = () => {
    if (!selectedTrack) return;
    setResult(null);
    setAudioError(null);
    tooSlowTriggeredRef.current = false;
    setRound((prev) => prev + 1);
  };

  const finalizeResult = (nextResult: Result) => {
    setResult(nextResult);
  };

  const handleTimingPress = () => {
    if (!selectedTrack || result) return;

    const audio = audioRef.current;
    if (!audio) return;

    const deltaMs = Math.round((audio.currentTime - selectedTrack.targetTime) * 1000);

    if (deltaMs > SLOW_LIMIT_MS) {
      finalizeResult({
        status: "too-slow",
        deltaMs,
        message: "Too Slow!",
      });
      return;
    }

    if (deltaMs >= PERFECT_EARLY_LIMIT_MS) {
      finalizeResult({
        status: "perfect",
        deltaMs,
        message: "Perfect!",
      });
      return;
    }

    if (deltaMs < 0) {
      finalizeResult({
        status: "fast",
        deltaMs,
        message: `Fast!\n${deltaMs}ms`,
      });
      return;
    }

    finalizeResult({
      status: "slow",
      deltaMs,
      message: `Slow!\n+${deltaMs}ms`,
    });
  };

  const handleEnded = () => {
    if (result || tooSlowTriggeredRef.current) return;
    tooSlowTriggeredRef.current = true;
    finalizeResult({
      status: "too-slow",
      deltaMs: null,
      message: "Too Slow!",
    });
  };

  useEffect(() => {
    if (!selectedTrack || result || screen !== "game") return;

    let raf = 0;
    const deadline = selectedTrack.targetTime + SLOW_LIMIT_MS / 1000;

    const watchDeadline = () => {
      const audio = audioRef.current;
      if (!audio || audio.paused || audio.ended || result) return;

      if (audio.currentTime >= deadline) {
        tooSlowTriggeredRef.current = true;
        finalizeResult({
          status: "too-slow",
          deltaMs: Math.round((audio.currentTime - selectedTrack.targetTime) * 1000),
          message: "Too Slow!",
        });
        return;
      }

      raf = requestAnimationFrame(watchDeadline);
    };

    raf = requestAnimationFrame(watchDeadline);
    return () => cancelAnimationFrame(raf);
  }, [screen, selectedTrack, result, round]);

  return (
    <div className="game-root">
      <main className="game-shell">
        <header className="game-header">
          <div>
            <p className="eyebrow">Perfect Timing</p>
            <p className="subtitle">Made by 이문빈</p>
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </header>

        {screen === "select" && (
          <section className="card">
            <h2>1. Select Track</h2>
            <div className="track-grid">
              {tracks.map((track) => (
                <article className="track-card" key={track.id}>
                  <div className="track-meta">
                    <h3>{track.title}</h3>
                    {track.description && <p>{track.description}</p>}
                  </div>
                  <button type="button" onClick={() => startTrack(track)}>
                    Start Round
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {screen === "game" && selectedTrack && (
          <section className="card">
            <audio
              key={round}
              ref={audioRef}
              src={selectedTrack.src}
              controls
              autoPlay
              preload="auto"
              onEnded={handleEnded}
              onError={() => setAudioError("Audio file not found. Check /public/music path.")}
            />

            {audioError && <p className="error">{audioError}</p>}

            <button
              type="button"
              className="tap-primary"
              onClick={handleTimingPress}
              disabled={Boolean(result) || Boolean(audioError)}
            >
              Tap!
            </button>

            <div className="game-secondary-actions">
              <button type="button" onClick={replayTrack}>
                Replay
              </button>
              <button type="button" onClick={resetToSelect}>
                Back to Select
              </button>
            </div>

            {result && (
              <section className="result-panel" aria-live="polite">
                <p className={`grade grade-${result.status}`}>{result.message}</p>
                {result.status === "too-slow" && result.deltaMs !== null && (
                  <p className="muted">Late by +{result.deltaMs} ms</p>
                )}
              </section>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
