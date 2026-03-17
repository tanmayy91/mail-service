"use client";

interface Props {
  plan: "none" | "free" | "starter" | "pro" | "enterprise" | "custom";
  size?: "sm" | "md";
}

const META: Record<string, { label: string; color: string; bg: string }> = {
  none:       { label: "None",       color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  free:       { label: "Free",       color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  starter:    { label: "Starter",    color: "#a78bfa", bg: "rgba(124,58,237,0.12)"  },
  pro:        { label: "Pro",        color: "#34d399", bg: "rgba(16,185,129,0.12)"  },
  enterprise: { label: "Enterprise", color: "#fbbf24", bg: "rgba(245,158,11,0.12)"  },
  custom:     { label: "Custom",     color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
};

export function PlanBadge({ plan, size = "sm" }: Props) {
  const m = META[plan] ?? META.free;
  return (
    <span
      style={{
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.color}40`,
        padding: size === "sm" ? "2px 9px" : "4px 12px",
        borderRadius: 9999,
        fontSize: size === "sm" ? 11 : 13,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {m.label}
    </span>
  );
}
