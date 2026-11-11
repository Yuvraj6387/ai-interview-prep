import React, { useRef } from 'react';

// A bar you drag to resize something, like the dividers on LeetCode.
// Pointer events cover mouse, touch and pen. onDrag gets how far the pointer
// has moved since the drag started ({ dx, dy }); onStart runs first so the
// caller can remember the starting size. Arrow keys nudge it for keyboard
// users, and a double click calls onReset.
const ResizeHandle = ({ direction, onStart, onDrag, onEnd, onKey, onReset, label, className = '' }) => {
  const start = useRef(null);
  const vertical = direction === 'vertical'; // a vertical bar resizes widths

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    onStart?.();
    // Stops the page text being selected while dragging.
    document.body.style.userSelect = 'none';
    document.body.style.cursor = vertical ? 'col-resize' : 'row-resize';
  };

  const handlePointerMove = (e) => {
    if (!start.current) return;
    onDrag({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y });
  };

  const stop = () => {
    if (!start.current) return;
    start.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    onEnd?.();
  };

  const handleKeyDown = (e) => {
    const keys = vertical ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
    if (keys[e.key]) {
      e.preventDefault();
      onKey?.(keys[e.key]);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={label}
      title={`${label} (double-click to reset)`}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={handleKeyDown}
      onDoubleClick={onReset}
      // touch-none: on phones the drag resizes instead of scrolling the page.
      className={`group touch-none select-none flex items-center justify-center outline-none ${
        vertical ? 'cursor-col-resize' : 'cursor-row-resize'
      } ${className}`}
    >
      <span
        className={`rounded-full bg-stone-300 group-hover:bg-orange-400 group-focus-visible:bg-orange-400 group-active:bg-orange-500 transition-colors ${
          vertical ? 'w-1 h-12' : 'h-1 w-12'
        }`}
      />
    </div>
  );
};

export default ResizeHandle;
