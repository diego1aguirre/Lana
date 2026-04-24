"use client";

import React from "react";

// ─── Base shimmer ─────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        background: "#1F2937",
        borderRadius: "12px",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    />
  );
}

// ─── Variants ─────────────────────────────────────────────────────────────────

export function SkeletonCard() {
  return <Skeleton style={{ width: "100%", height: 120 }} />;
}

export function SkeletonText({ width = "100%" }: { width?: string | number }) {
  return <Skeleton style={{ width, height: 16, borderRadius: "6px" }} />;
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0 }} />;
}

export function SkeletonChart() {
  return <Skeleton style={{ width: "100%", height: 300 }} />;
}
