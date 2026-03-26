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
  status: "too-fast" | "perfect" | "too-slow";
  deltaMs: number | null;
  message: string;
};

const PERFECT_MIN_MS = -150;
const PERFECT_MAX_MS = 150;

const formatSignedMs = (deltaMs: number) => (deltaMs >= 0 ? `+${deltaMs}ms` : `${deltaMs}ms`);

type GameClientProps = {
  tracks: Track[];
};

export default function GameClient({ tracks }: GameClientProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [screen, setScreen] = useState<Screen>("select");
  const [theme, setTheme] = useState<Theme>("light");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [round, setRound] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  };

  const replayTrack = () => {
    if (!selectedTrack) return;
    setResult(null);
    setAudioError(null);
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

    if (deltaMs >= PERFECT_MAX_MS + 1) {
      finalizeResult({
        status: "too-slow",
        deltaMs,
        message: `Too Slow!\n${formatSignedMs(deltaMs)}`,
      });
      return;
    }

    if (deltaMs >= PERFECT_MIN_MS && deltaMs <= PERFECT_MAX_MS) {
      finalizeResult({
        status: "perfect",
        deltaMs,
        message: `Perfect!\n${formatSignedMs(deltaMs)}`,
      });
      return;
    }

    finalizeResult({
      status: "too-fast",
      deltaMs,
      message: `Too Fast!\n${formatSignedMs(deltaMs)}`,
    });
  };

  const handleEnded = () => {
    if (result) return;
    finalizeResult({
      status: "too-slow",
      deltaMs: null,
      message: "Too Slow!",
    });
  };

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
          <section className="card select-card">
            <div className="track-grid">
              {tracks.map((track) => (
                <article className="track-card" key={track.id}>
                  <div className="track-meta">
                    <h3>{track.title}</h3>
                    {track.description && <p>{track.description}</p>}
                  </div>
                  <button type="button" className="track-start-btn" onClick={() => startTrack(track)}>
                    Start
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {screen === "game" && selectedTrack && (
          <section className="card game-card">
            {/*
              GH Pages serves the app under /<repo>, so we prefix basePath for public assets.
            */}
            <audio
              key={round}
              ref={audioRef}
              src={encodeURI(`${basePath}${selectedTrack.src}`)}
              autoPlay
              preload="auto"
              onEnded={handleEnded}
              onError={() => setAudioError("Audio file not found. Check /public/music path.")}
              className="sr-audio"
            />

            {audioError && <p className="error">Audio file not found. Check /public/music path.</p>}

            <div className="now-playing">
              <h3>{selectedTrack.title}</h3>
              {selectedTrack.description && <p>{selectedTrack.description}</p>}
            </div>

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
              </section>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
