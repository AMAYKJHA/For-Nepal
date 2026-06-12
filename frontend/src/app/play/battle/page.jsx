"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/components/play/PhaserGame"), {
  ssr: false,
});

export default function BattlePage() {
  return <PhaserGame />;
}
