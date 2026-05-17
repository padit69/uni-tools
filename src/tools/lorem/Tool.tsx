import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/tool/CopyButton";
import { cn } from "@/lib/cn";

const WORDS = `lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum`.split(/\s+/);

type Unit = "paragraphs" | "sentences" | "words";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(n: number) {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  return out;
}

function makeSentence(): string {
  const len = rand(6, 14);
  const words = pick(len);
  words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
}

function makeParagraph(): string {
  const n = rand(3, 6);
  return Array.from({ length: n }, makeSentence).join(" ");
}

function generate(count: number, unit: Unit, startLorem: boolean): string {
  if (unit === "words") {
    const words = pick(count);
    if (startLorem && count >= 2) {
      words[0] = "Lorem";
      words[1] = "ipsum";
    } else if (startLorem && count >= 1) {
      words[0] = "Lorem";
    }
    return words.join(" ");
  }
  if (unit === "sentences") {
    const arr = Array.from({ length: count }, makeSentence);
    if (startLorem && arr.length > 0) {
      arr[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    }
    return arr.join(" ");
  }
  const arr = Array.from({ length: count }, makeParagraph);
  if (startLorem && arr.length > 0) {
    arr[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " + arr[0];
  }
  return arr.join("\n\n");
}

export default function LoremTool() {
  const [count, setCount] = useState(3);
  const [unit, setUnit] = useState<Unit>("paragraphs");
  const [startLorem, setStartLorem] = useState(true);
  const [seed, setSeed] = useState(0);

  const output = useMemo(
    () => generate(count, unit, startLorem),
    // include seed to force regen; also recompute on count/unit/startLorem
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, unit, startLorem, seed]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="h-7 w-16 rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-0.5 text-xs">
            {(["paragraphs", "sentences", "words"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={cn(
                  "rounded px-2 py-0.5",
                  unit === u ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {u === "paragraphs" ? "Paragraphs" : u === "sentences" ? "Sentences" : "Words"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              checked={startLorem}
              onChange={(e) => setStartLorem(e.target.checked)}
              className="size-3 accent-[var(--primary)]"
            />
            Start with "Lorem ipsum..."
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSeed((s) => s + 1)}>
            <RefreshCw className="size-3.5" /> Generate
          </Button>
          <CopyButton text={output} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-6 leading-relaxed text-[var(--foreground)]">
        {output}
      </div>
    </div>
  );
}
