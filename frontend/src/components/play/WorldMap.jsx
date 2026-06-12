"use client";

import Link from "next/link";
import styles from "./play.module.css";

const NODES = [
  { id: 1, title: "The Gate", x: 15, y: 70 },
  { id: 2, title: "Whispering Library", x: 38, y: 45 },
  { id: 3, title: "Hall of Trials", x: 62, y: 60 },
  { id: 4, title: "Archmage's Spire", x: 85, y: 30 },
];

export default function WorldMap() {
  return (
    <section className={styles.worldMap}>
      <h1 className={styles.worldMapTitle}>World Map</h1>
      <div className={styles.mapBoard}>
        {NODES.map((node) => (
          <Link
            key={node.id}
            href="/play/battle"
            className={styles.mapNode}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span className={styles.mapNodeDot} />
            <span className={styles.mapNodeLabel}>{node.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
