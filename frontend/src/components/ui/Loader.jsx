'use client';

import { useState, useEffect } from 'react';
import styles from './Loader.module.css';

const STEPS = [
  "Fetching file...",
  "Reading File...",
  "Generating Questions...",
  "Converting to level...",
  "Chunking text into concepts...",
  "Extracting keywords and core terms...",
  "Creating wrong answer choices (distractors)...",
  "Writing hints and explanations...",
  "Mapping questions into map...",
  "Setting up level milestones and XP rewards...",
  "Formatting data structures for the frontend...",
  "Saving questions and levels to database...",
  "Verifying game logic and data integrity...",
  "Deploying data to the live user interface..."
];

const Loader = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    // Change step every 1.2 seconds
    const interval = setInterval(() => {
      setFade(false); // Trigger fade out
      setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % STEPS.length);
        setFade(true); // Trigger fade in
      }, 300); // Wait 300ms for fade out to finish
    }, 1200); 

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.loaderWrapper}>
        <div className={styles.loader} />
        <div className={styles.letters}>
          {"Generating".split('').map((letter, i) => (
            <span 
              key={i} 
              className={styles.loaderLetter} 
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
      
      {/* Step Text with Fade Animation */}
      <div className={`${styles.stepText} ${fade ? styles.fadeIn : styles.fadeOut}`}>
        {STEPS[currentStep]}
      </div>
      
      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} 
        />
      </div>
    </div>
  );
}

export default Loader;