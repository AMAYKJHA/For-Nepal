'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Loader from '@/components/ui/Loader.jsx'; 
import { uploadAndGenerateQuiz } from '@/lib/api';
import styles from './page.module.css';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setErrorMessage('Please select a PDF file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setErrorMessage('');
      
      if (!title) {
        const fileName = file.name.replace('.pdf', '').replace(/[-_]/g, ' ');
        setTitle(fileName);
      }
    }
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setErrorMessage('');
      if (!title) {
        const fileName = file.name.replace('.pdf', '').replace(/[-_]/g, ' ');
        setTitle(fileName);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a PDF file');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Please enter a title for your quiz');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const result = await uploadAndGenerateQuiz(
        selectedFile,
        title.trim(),
        instructions.trim()
      );

      if (result.success) {
        setStatus('success');
        
        if (result.topicId) {
          localStorage.setItem('scholar_current_topic_id', result.topicId);
        }
        
        setTimeout(() => {
          router.push('/play/world-map');
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Failed to generate quiz');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message || 'An unexpected error occurred');
    }
  };

  const handleReturn = () => {
    setStatus('idle');
    setErrorMessage('');
  };

  const handleTryAgain = () => {
    setStatus('idle');
    setErrorMessage('');
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setTitle('');
    setInstructions('');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.bgGridPattern} />
      <div className={styles.glowBlob} />

      {/* Full-screen overlays for loading, success, and error states */}
      {status === 'loading' && <Loader />}
      
      {status === 'success' && (
        <div className={styles.fullScreenOverlay}>
          <div className={styles.successContent}>
            <span className={`material-symbols-outlined ${styles.successIcon}`}>check_circle</span>
            <h2 className={styles.successTitle}>Quest Created!</h2>
            <p className={styles.successText}>Redirecting to World Map...</p>
          </div>
        </div>
      )}
      
      {status === 'error' && (
        <div className={styles.fullScreenOverlay}>
          <div className={styles.errorContent}>
            <span className={`material-symbols-outlined ${styles.errorIcon}`}>error</span>
            <h2 className={styles.errorTitle}>Summoning Failed</h2>
            <p className={styles.errorText}>
              {errorMessage || "We couldn't parse the document. Please check the file and try again."}
            </p>
            <div className={styles.errorActions}>
              <button className={styles.btnSecondary} onClick={handleReturn}>
                Return To Upload
              </button>
              <button className={styles.btnPrimary} onClick={handleTryAgain}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main upload form - only shown when idle */}
      {status === 'idle' && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContainer}>
            {/* Header */}
            <header className={styles.header}>
              <Image 
                src="/assets/logo.png" 
                alt="Logo" 
                width={40} 
                height={40} 
                className={styles.logoImg} 
              />
              <h1 className={styles.headerTitle}>Create New Quiz</h1>
            </header>

            {/* Error Message */}
            {errorMessage && (
              <div className={styles.errorMessage}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                {errorMessage}
              </div>
            )}

            {/* Dropzone */}
            <div 
              className={styles.dropzone}
              onClick={handleDropzoneClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className={`${styles.cornerAccent} ${styles.cornerAccentTl}`} />
              <div className={`${styles.cornerAccent} ${styles.cornerAccentTr}`} />
              <div className={`${styles.cornerAccent} ${styles.cornerAccentBl}`} />
              <div className={`${styles.cornerAccent} ${styles.cornerAccentBr}`} />
              
              {selectedFile ? (
                <div className={styles.fileInfo}>
                  <span className={`material-symbols-outlined ${styles.fileIcon}`}>description</span>
                  <div className={styles.fileDetails}>
                    <p className={styles.fileName}>{selectedFile.name}</p>
                    <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <button 
                    className={styles.removeFileBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel();
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.iconBox}>
                    <span className={`material-symbols-outlined ${styles.uploadIcon}`}>upload</span>
                  </div>
                  <p className={styles.boxPrompt}>Click to Upload PDF</p>
                  <p className={styles.boxMuted}>or drag and drop your study materials here</p>
                </>
              )}
              
              <input 
                ref={fileInputRef}
                type="file" 
                className={styles.fileInput} 
                accept=".pdf" 
                onChange={handleFileSelect}
              />
            </div>

            {/* Title Input */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Quiz Title *</label>
              <div className={styles.inputContainer}>
                <input 
                  type="text"
                  className={styles.input} 
                  placeholder="e.g., Operating Systems Chapter 4"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Custom Instructions (Optional)</label>
              <div className={styles.inputContainer}>
                <textarea 
                  className={styles.textarea} 
                  placeholder="e.g., Focus heavily on process scheduling algorithms. Include 5 scenario-based questions and make the difficulty Level 3."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionsContainer}>
              <Link href="/play" className={styles.btnSecondary}>Cancel</Link>
              <button 
                className={styles.btnPrimary} 
                onClick={handleProcess}
                disabled={!selectedFile || !title.trim()}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                Generate Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}