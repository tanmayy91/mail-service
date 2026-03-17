"use client";

import React from "react";

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  color?: string;
  trend?: { value: string; up: boolean };
}

export function StatCard({ label, value, icon, sub, color = "#7c3aed", trend }: Props) {
  return (
    <div
      style={{
        background: "#13131f",
        border: "1px solid #1e1e2e",
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}55`;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#1e1e2e";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: `${color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
          }}
        >
          {icon}
        </div>
        {trend && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: trend.up ? "#10b981" : "#ef4444",
              background: trend.up ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              padding: "2px 8px",
              borderRadius: 100,
            }}
          >
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}
