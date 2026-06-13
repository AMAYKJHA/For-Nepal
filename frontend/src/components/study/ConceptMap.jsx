'use client';

import { useEffect, useRef, useState } from 'react';
import { conceptMapAPI } from '@/utils/client';
import styles from './ConceptMap.module.css';

export default function ConceptMap() {
  const [diagram, setDiagram] = useState('graph TD\n  Start[Learning Map] --> Concepts[Add Data]');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('memories');
  const [error, setError] = useState('');
  
  const containerRef = useRef(null);
  const panZoomRef = useRef(null);
  const mermaidRef = useRef(null);
  const svgPanZoomRef = useRef(null);

  const renderDiagram = async (code) => {
    if (!containerRef.current || !mermaidRef.current || !svgPanZoomRef.current) return;
    
    const mermaid = mermaidRef.current;
    const svgPanZoom = svgPanZoomRef.current;

    const id = `map-${Date.now()}`;
    try {
      if (panZoomRef.current) {
        panZoomRef.current.destroy();
        panZoomRef.current = null;
      }
      
      const { svg } = await mermaid.render(id, code);
      containerRef.current.innerHTML = svg;
      
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.style.width = '100%';
        svgElement.style.height = '600px';
        svgElement.style.maxWidth = 'none';
        
        panZoomRef.current = svgPanZoom(svgElement, {
          zoomEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
          minZoom: 0.1,
          maxZoom: 10
        });
      }
      
      setError('');
    } catch (e) {
      setError('Could not render Mermaid diagram. AI may have generated invalid syntax.');
      console.error(e);
      containerRef.current.innerHTML = `<div class="${styles.diagramError}">Diagram generation failed. Try changing the source or waiting a moment.</div>`;
    }
  };

  // Dynamically initialize libraries on the client to prevent SSR crashes
  useEffect(() => {
    let isMounted = true;
    
    const initLibs = async () => {
      const mermaid = (await import('mermaid')).default;
      const svgPanZoom = (await import('svg-pan-zoom')).default;
      
      if (!isMounted) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis'
        }
      });
      
      mermaidRef.current = mermaid;
      svgPanZoomRef.current = svgPanZoom;
      
      // Render initial diagram once libraries are ready
      renderDiagram(diagram);
    };
    
    initLibs();

    return () => {
      isMounted = false;
      if (panZoomRef.current) {
        panZoomRef.current.destroy();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await conceptMapAPI.generate({ source });
      setDiagram(data.diagram);
      await renderDiagram(data.diagram);
    } catch (e) {
      console.error(e);
      const errorMsg = e.response?.data?.error || 'Knowledge Graph generation failed. Make sure you have data in your knowledge base.';
      setError(errorMsg);
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Knowledge Graph</h1>
            <p className={styles.subtitle}>AI-powered interactive map of concepts, relationships, and learning gaps.</p>
          </div>

          <div className={styles.actions}>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={styles.select}
            >
              <option value="memories">From Memories (Semantic Network)</option>
              <option value="topics">From Mastery (Gap Detection)</option>
              <option value="pdf">From Documents (Structure)</option>
            </select>
            <button
              onClick={generate}
              disabled={loading}
              className={styles.generateBtn}
            >
              {loading ? 'Analyzing Content...' : 'Generate Graph'}
            </button>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.diagramWrapper}>
          <div className={styles.legendWrapper}>
            {source === 'topics' && (
              <div className={styles.legendBox}>
                <span className={styles.legendMastered}>🟢 Mastered</span>
                <span className={styles.legendPartial}>🟡 Partial</span>
                <span className={styles.legendNeedsReview}>🔴 Needs Review</span>
              </div>
            )}
          </div>
          <div ref={containerRef} className={styles.diagramContainer} />
        </div>
      </div>
    </div>
  );
}