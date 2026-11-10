import React from 'react';

// Decorative line art for the empty space beside each page title, in the same
// style as the mock interview background. Drawn in currentColor on a transparent
// background, so the caller sets color and opacity with text-* and opacity-*.
const Svg = ({ className, children }) => (
  <svg
    viewBox="0 0 600 170"
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const Sparkle = ({ x, y }) => <path d={`M${x} ${y - 12}v24M${x - 12} ${y}h24`} strokeWidth="3" />;
const Dot = ({ x, y }) => <circle cx={x} cy={y} r="4" fill="currentColor" stroke="none" />;

// A resume under a magnifying glass, a score ring and a checklist.
export const ResumeAnalyzerArt = ({ className = '' }) => (
  <Svg className={className}>
    {/* Checklist */}
    <rect x="70" y="40" width="20" height="20" rx="5" />
    <path d="M75 50l4 4 7-8M104 50h56" />
    <rect x="70" y="78" width="20" height="20" rx="5" />
    <path d="M75 88l4 4 7-8M104 88h44" />
    <rect x="70" y="116" width="20" height="20" rx="5" />
    <path d="M104 126h52" />

    {/* Resume */}
    <path d="M230 18h70l26 26v106a10 10 0 0 1-10 10h-86a10 10 0 0 1-10-10V28a10 10 0 0 1 10-10z" />
    <path d="M300 18v26h26" />
    <circle cx="250" cy="48" r="10" />
    <path d="M268 44h22M268 54h14M236 76h70M236 92h58M236 108h66M236 124h40" strokeWidth="3" />

    {/* Magnifying glass */}
    <circle cx="318" cy="112" r="28" />
    <path d="M338 132l26 26" strokeWidth="6" />

    {/* Score ring */}
    <circle cx="470" cy="78" r="44" strokeWidth="3" strokeDasharray="4 8" />
    <path d="M470 34a44 44 0 1 1-42 57" strokeWidth="6" />
    <path d="M452 78l12 12 22-24" strokeWidth="5" />

    <Sparkle x={560} y={30} />
    <Sparkle x={400} y={150} />
    <Dot x={190} y={150} />
    <Dot x={545} y={140} />
  </Svg>
);

// A resume being laid out: section blocks, a pencil and colour swatches.
export const ResumeBuilderArt = ({ className = '' }) => (
  <Svg className={className}>
    {/* Layout grid */}
    <rect x="60" y="34" width="44" height="44" rx="8" />
    <rect x="116" y="34" width="44" height="44" rx="8" />
    <rect x="60" y="90" width="100" height="44" rx="8" />
    <path d="M74 112h72" strokeWidth="3" />

    {/* Resume page with sections */}
    <rect x="230" y="14" width="120" height="148" rx="10" />
    <rect x="246" y="30" width="88" height="22" rx="5" />
    <path d="M246 70h40M246 84h88M246 96h76M246 116h40M246 130h88M246 142h60" strokeWidth="3" />

    {/* Pencil writing on the page */}
    <path d="M330 150l70-70 16 16-70 70-22 6z" />
    <path d="M388 92l16 16M330 150l6 22" />

    {/* Colour swatches */}
    <circle cx="470" cy="50" r="16" />
    <circle cx="512" cy="50" r="16" fill="currentColor" fillOpacity="0.35" />
    <circle cx="491" cy="88" r="16" fill="currentColor" fillOpacity="0.6" />
    <path d="M450 130h80M470 122v16M505 122v16" strokeWidth="3" />

    <Sparkle x={200} y={30} />
    <Sparkle x={565} y={120} />
    <Dot x={190} y={140} />
    <Dot x={430} y={22} />
  </Svg>
);

// A resume and a job post meeting on a target, with a match percentage.
export const JobMatcherArt = ({ className = '' }) => (
  <Svg className={className}>
    {/* Resume */}
    <rect x="60" y="40" width="80" height="104" rx="10" />
    <circle cx="82" cy="64" r="9" />
    <path d="M98 60h28M98 70h18M74 94h52M74 108h40M74 122h48" strokeWidth="3" />

    {/* Job post (briefcase) */}
    <rect x="460" y="62" width="96" height="70" rx="10" />
    <path d="M488 62V50a8 8 0 0 1 8-8h24a8 8 0 0 1 8 8v12M460 92h96M500 92v10h16V92" />

    {/* Dashed links into the target */}
    <path d="M140 92h88M372 96h88" strokeWidth="3" strokeDasharray="6 9" />

    {/* Target with arrow */}
    <circle cx="300" cy="92" r="58" />
    <circle cx="300" cy="92" r="38" />
    <circle cx="300" cy="92" r="16" fill="currentColor" fillOpacity="0.4" />
    <path d="M300 92l52-52M352 40h-18M352 40v18" strokeWidth="5" />

    {/* Match percentage */}
    <circle cx="398" cy="150" r="5" />
    <circle cx="422" cy="170" r="5" />
    <path d="M426 146l-32 28" strokeWidth="3" />

    <Sparkle x={195} y={30} />
    <Sparkle x={575} y={160} />
    <Dot x={210} y={150} />
    <Dot x={400} y={30} />
  </Svg>
);

// Shared placement: top-right beside the page title, hidden on phones.
// Kept short enough to stay inside the header strip, above the first card.
export const PAGE_ART_CLASS = 'pointer-events-none absolute top-2 right-6 hidden lg:block w-[19rem] xl:w-[22rem] text-orange-300 opacity-[0.16]';
