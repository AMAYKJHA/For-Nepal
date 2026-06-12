"use client";

import dynamic from "next/dynamic";

// Phaser must only load on the client.
const PhaserGame = dynamic(() => import("@/components/play/PhaserGame"), {
  ssr: false,
});

export default function PlayPage() {
  return <PhaserGame />;
}
