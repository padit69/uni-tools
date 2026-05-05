import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToolHistory } from "@/hooks/useToolHistory";

export default function TemplateTool() {
  const [input, setInput] = useState("");
  const history = useToolHistory("template");

  const handleRun = () => {
    if (!input) return;
    history.push(input);
    // ... tool logic
  };

  return (
    <div className="flex h-full flex-col p-4 gap-4">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Input..."
        className="min-h-32 w-full rounded-lg border border-[var(--border)] bg-transparent p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      />
      <Button onClick={handleRun} disabled={!input} className="self-start">
        Run
      </Button>
    </div>
  );
}
