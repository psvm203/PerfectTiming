import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import GameClient, { type Track } from "./game-client";

type TracksYaml = {
  tracks?: Track[];
};

const FALLBACK_TRACKS: Track[] = [
  {
    id: "song-1",
    title: "Track 01",
    src: "/music/룰라 - 3!4!.wav",
    targetTime: 10,
    description: "3! 4! 부분에 타이밍 맞게 버튼을 누르세요.",
  },
];

async function loadTracks(): Promise<Track[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "tracks.yaml");
    const text = await readFile(filePath, "utf8");
    const parsed = YAML.parse(text) as TracksYaml;

    if (!parsed?.tracks?.length) {
      return FALLBACK_TRACKS;
    }

    return parsed.tracks;
  } catch {
    return FALLBACK_TRACKS;
  }
}

export default async function Page() {
  const tracks = await loadTracks();
  return <GameClient tracks={tracks} />;
}
