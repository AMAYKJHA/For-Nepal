"use client";

import { useState } from "react";
import styles from "./chat.module.css";
import ChatView from "./ChatView";
import MemoryVault from "./MemoryVault";
import SearchMemory from "./SearchMemory";
import Flashcards from "./Flashcards";
import ModelSelector from "./ModelSelector";

const VIEWS = {
  chat: { label: "Chat", render: () => <ChatView /> },
  memory: { label: "Memory Vault", render: () => <MemoryVault /> },
  search: { label: "Search Memory", render: () => <SearchMemory /> },
  flashcards: { label: "Flashcards", render: () => <Flashcards /> },
};

export default function ChatModeLayout() {
  const [view, setView] = useState("chat");

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <ModelSelector />
        <nav className={styles.nav}>
          {Object.entries(VIEWS).map(([key, { label }]) => (
            <button
              key={key}
              className={`${styles.navItem} ${
                view === key ? styles.navItemActive : ""
              }`}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>{VIEWS[view].render()}</main>
    </div>
  );
}
