"use client";

import { useState } from "react";

interface Props {
  aiResponseId: number;
  initialOverride: boolean | null;
  adminKey: string;
}

const OPTIONS = [
  { value: null, label: "—" },
  { value: true, label: "Manipulated" },
  { value: false, label: "Not manipulated" },
] as const;

export function AiOverrideToggle({
  aiResponseId,
  initialOverride,
  adminKey,
}: Props) {
  const [override, setOverride] = useState<boolean | null>(initialOverride);
  const [saving, setSaving] = useState(false);

  async function select(value: boolean | null) {
    if (saving || value === override) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/ai-override?key=${encodeURIComponent(adminKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: aiResponseId, humanOverride: value }),
      });
      setOverride(value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inline-flex rounded-md border overflow-hidden text-sm">
      {OPTIONS.map(({ value, label }) => {
        const active = override === value;
        let activeClass = "";
        if (active && value === true)
          activeClass = "bg-destructive text-destructive-foreground";
        else if (active && value === false)
          activeClass = "bg-secondary text-secondary-foreground";
        else if (active)
          activeClass = "bg-muted text-muted-foreground";

        return (
          <button
            key={String(value)}
            onClick={() => select(value)}
            disabled={saving}
            className={`px-3 py-1 border-r last:border-r-0 transition-colors ${
              active
                ? activeClass
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
