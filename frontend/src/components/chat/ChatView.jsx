"use client";

import { useState } from "react";
import styles from "./chat.module.css";

export default function ChatView() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  function send(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");
  }

  return (
    <div className={styles.chatView}>
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <p className={styles.placeholder}>Ask ScholarAI anything…</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${styles[m.role]}`}>
              {m.text}
            </div>
          ))
        )}
      </div>

      <form className={styles.composer} onSubmit={send}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
        />
        <button type="submit" className={styles.sendBtn}>
          Send
        </button>
      </form>
    </div>
  );
}
