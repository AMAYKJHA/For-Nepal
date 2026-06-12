"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePDFUpload } from "@/hooks/usePDFUpload";
import styles from "./page.module.css";

export default function StartNewGame() {
  const router = useRouter();
  const { upload, progress: uploadProgress, uploading } = usePDFUpload();

  const [selectedFile, setSelectedFile] = useState(null);
  const [instructions, setInstructions] = useState('');

  // Summoning states
  const [isSummoning, setIsSummoning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [subtext, setSubtext] = useState('Parsing your grimoire...');
  const [textOpacity, setTextOpacity] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  const subtexts = [
    'Parsing your pdf...',
    'Preparing the Quiz...',
    'Generating questions...',
    'Aligning...'
  ];

  const subtextIndexRef = useRef(0);
  const textCycleIntervalRef = useRef(null);

  // File selection handler
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg('');
    }
  };

  // Click on Proceed button
  const handleProceed = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please choose a PDF or TXT file to upload first.");
      return;
    }

    setIsSummoning(true);
    setProgress(0);
    setErrorMsg('');
    subtextIndexRef.current = 0;
    setSubtext(subtexts[0]);
    setTextOpacity(1);

    try {
      // Trigger the real upload API call
      await upload(selectedFile);
      // Handled by the progress useEffect below for redirecting on 100% success
    } catch (err) {
      console.error("Upload failed:", err);
      setErrorMsg("Failed to parse PDF. Please check your document and try again.");
    }
  };

  // Cancel summoning ritual
  const handleCancelSummoning = () => {
    setIsSummoning(false);
    setProgress(0);
    setErrorMsg('');
    if (textCycleIntervalRef.current) clearInterval(textCycleIntervalRef.current);
  };

  // Sync component progress with the real uploadProgress
  useEffect(() => {
    if (isSummoning) {
      // Follow the actual upload hook progress
      if (uploadProgress > progress) {
        setProgress(uploadProgress);
      }

      // If upload successfully completed and not uploading anymore
      if (uploadProgress === 100 && !uploading && !errorMsg) {
        const redirectTimer = setTimeout(() => {
          setIsSummoning(false);
          router.push('/play/world-map/');
        }, 1000);
        return () => clearTimeout(redirectTimer);
      }
    }
  }, [uploadProgress, uploading, isSummoning, progress, router, errorMsg]);

  // Effect for subtext cycling during Summoning loading state
  useEffect(() => {
    if (isSummoning && !errorMsg) {
      textCycleIntervalRef.current = setInterval(() => {
        // Fade out
        setTextOpacity(0);

        setTimeout(() => {
          subtextIndexRef.current = (subtextIndexRef.current + 1) % subtexts.length;
          setSubtext(subtexts[subtextIndexRef.current]);
          // Fade in
          setTextOpacity(1);
        }, 300);
      }, 3000);
    }

    return () => {
      if (textCycleIntervalRef.current) clearInterval(textCycleIntervalRef.current);
    };
  }, [isSummoning, errorMsg]);

  // Loading / Summoning view
  if (isSummoning) {
    return (
      <div className={styles.pageContainer}>
        {/* Faux Home Screen Background (Dimmed) */}
        <div className={styles.bgGridPattern}></div>
        <div className={styles.glowBlob}></div>

        {/* Modal Backdrop */}
        <div className={styles.modalBackdrop}>
          {/* Summoning Panel */}
          <main className={styles.summoningPanel}>
            {/* L-Shaped Corner Ornaments */}
            <div className={`${styles.summoningOrnament} ${styles.summoningOrnamentTl}`}></div>
            <div className={`${styles.summoningOrnament} ${styles.summoningOrnamentTr}`}></div>
            <div className={`${styles.summoningOrnament} ${styles.summoningOrnamentBl}`}></div>
            <div className={`${styles.summoningOrnament} ${styles.summoningOrnamentBr}`}></div>

            {/* Magic Circle Animation Placeholder */}
            <div className={styles.magicCircleContainer}>
              {/* Outer Ring */}
              <div className={styles.outerRing}></div>
              {/* Inner Ring */}
              <div className={styles.innerRing}></div>
              {/* Center Icon */}
              <span className={`material-symbols-outlined ${styles.centerIcon}`}>flare</span>
            </div>

            {/* Typography Section */}
            <div className={styles.titleArea}>
              <h1 className={styles.summoningTitle}>
                {errorMsg ? "Generation Failed" : "Generating your questions..."}
              </h1>
              <div className={styles.subtextWrapper}>
                <p
                  className={styles.loadingSubtext}
                  style={{ opacity: textOpacity, color: errorMsg ? 'var(--error)' : 'var(--on-surface-variant)' }}
                >
                  {errorMsg ? errorMsg : subtext}
                </p>
              </div>
            </div>

            {/* Pixel-Segmented Progress Bar */}
            {!errorMsg && (
              <div className={styles.progressBar}>
                {/* Segment Grid Overlay */}
                <div className={styles.progressOverlay}></div>
                {/* The Fill Layer */}
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                >
                  {/* Subtle particle/stripe effect on the fill */}
                  <div className={styles.progressStripeEffect}></div>
                </div>
              </div>
            )}

            {/* Cancel / Back Button */}
            <button
              onClick={handleCancelSummoning}
              className={styles.cancelRitualBtn}
              type="button"
            >
              {errorMsg ? "Return to Upload" : "Cancel Generation"}
            </button>
          </main>
        </div>
      </div>
    );
  }

  // Normal Form view
  return (
    <div className={styles.pageContainer}>
      {/* Faux Home Screen Background (Dimmed) */}
      <div className={styles.bgGridPattern}></div>
      <div className={styles.glowBlob}></div>

      {/* Modal Backdrop */}
      <div className={styles.modalBackdrop}>
        {/* Modal Container */}
        <div className={styles.modalContainer}>
          {/* Ornaments */}
          <div className={`${styles.ornament} ${styles.ornamentTl}`}></div>
          <div className={`${styles.ornament} ${styles.ornamentTr}`}></div>
          <div className={`${styles.ornament} ${styles.ornamentBl}`}></div>
          <div className={`${styles.ornament} ${styles.ornamentBr}`}></div>

          {/* Header */}
          <div className={styles.header}>
            <img 
              src="/logo.png" 
              alt="Scholar Logo" 
              className={styles.logoImg}
            />
            <h2 className={styles.headerTitle}>Scholar</h2>
          </div>

          {/* Boxed Dropzone Input */}
          <div className={styles.dropzone}>
            {/* Decorative corner accents for the dropzone */}
            <div className={`${styles.cornerAccent} ${styles.cornerAccentTl}`}></div>
            <div className={`${styles.cornerAccent} ${styles.cornerAccentTr}`}></div>
            <div className={`${styles.cornerAccent} ${styles.cornerAccentBl}`}></div>
            <div className={`${styles.cornerAccent} ${styles.cornerAccentBr}`}></div>

            <div className={styles.iconBox}>
              <span className={`material-symbols-outlined ${styles.uploadIcon}`}>
                upload_file
              </span>
            </div>

            {selectedFile ? (
              <>
                <p className={styles.boxPrompt}>Document Selected</p>
                <p className={styles.boxMuted} style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                  {selectedFile.name}
                </p>
                <p className={styles.boxMuted} style={{ fontSize: '12px' }}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </>
            ) : (
              <>
                <p className={styles.boxPrompt}>Drag your PDF here</p>
                <p className={styles.boxMuted}>Supported runes: PDF, TXT. Max size: 10MB.</p>
              </>
            )}

            {/* Hidden real file input covering the dropzone box */}
            <input
              aria-label="Upload PDF"
              className={styles.fileInput}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
            />
          </div>

          {/* Custom Ritual Instructions Section */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Custom Quiz Generation Instructions</label>
            <div className={styles.inputContainer}>
              <textarea
                className={styles.textarea}
                placeholder="e.g. Focus on memory management and paging algorithms..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
              <div className={`${styles.ornament} ${styles.ornamentTl}`}></div>
              <div className={`${styles.ornament} ${styles.ornamentTr}`}></div>
              <div className={`${styles.ornament} ${styles.ornamentBl}`}></div>
              <div className={`${styles.ornament} ${styles.ornamentBr}`}></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actionsContainer}>
            <Link
              href="/"
              className={styles.btnSecondary}
            >
              Cancel
            </Link>
            <button
              onClick={handleProceed}
              className={styles.btnPrimary}
              type="button"
            >
              Proceed
              <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}