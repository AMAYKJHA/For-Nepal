"use client";

import { useEffect, useRef } from "react";
import styles from "./play.module.css";
import HPBar from "./HPBar";
import QuestionBox from "./QuestionBox";
import ShieldAttackControls from "./ShieldAttackControls";

export default function PhaserGame() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      // Dynamically import Phaser + config so it never runs on the server.
      const Phaser = (await import("phaser")).default;
      const { createGameConfig } = await import("@/game/config");

      if (!mounted || gameRef.current) return;

      gameRef.current = new Phaser.Game(
        createGameConfig(Phaser, containerRef.current)
      );
    }

    boot();

    return () => {
      mounted = false;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className={styles.gameShell}>
      <HPBar />
      <div ref={containerRef} className={styles.canvasMount} id="game-root" />
      <QuestionBox />
      <ShieldAttackControls />
    </div>
  );
}
