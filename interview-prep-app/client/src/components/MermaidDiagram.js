import React, { useEffect, useId, useState } from 'react';

// Mermaid is large, so it is only downloaded the first time an answer
// actually contains a diagram.
let mermaidPromise = null;
const loadMermaid = () => {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: 'base',
        fontFamily: 'Inter, sans-serif',
        themeVariables: {
          primaryColor: '#fff7ed',
          primaryBorderColor: '#fb923c',
          primaryTextColor: '#27272a',
          lineColor: '#ea580c',
          edgeLabelBackground: '#ffffff',
          fontSize: '14px',
        },
        flowchart: { curve: 'basis', padding: 12 },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
};

// A left-to-right chart with many boxes gets too small to read on a phone,
// so on narrow screens it is drawn top-to-bottom instead.
const fitToScreen = (chart) => {
  const boxes = (chart.match(/\[/g) || []).length;
  if (window.innerWidth < 640 && boxes > 4) {
    return chart.replace(/^(\s*(?:flowchart|graph))\s+LR\b/m, '$1 TD');
  }
  return chart;
};

const MermaidDiagram = ({ chart }) => {
  const id = `diagram-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg('');
    setFailed(false);
    loadMermaid()
      .then((mermaid) => mermaid.render(id, fitToScreen(chart)))
      .then((result) => { if (!cancelled) setSvg(result.svg); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [chart, id]);

  // The AI wrote a diagram Mermaid can't read: show its text instead of nothing.
  if (failed) {
    return (
      <pre className="my-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return <div className="my-3 h-24 rounded-xl bg-orange-50/60 animate-pulse" aria-label="Drawing diagram" />;
  }

  return (
    <div
      className="my-3 p-3 rounded-xl border border-orange-100 bg-orange-50/40 overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // Mermaid's own output, rendered with securityLevel 'strict' (sanitised).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidDiagram;
