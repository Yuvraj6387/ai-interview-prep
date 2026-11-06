import React from 'react';

// Decorative line art for the mock interview page. It is wider than the setup
// form so the pieces sit in the empty space around it: the interviewer's question
// bubble and a timer on the left, the candidate's reply and code on the right, and
// a microphone below. Drawn in currentColor, so the caller sets its color and
// transparency with text-* and opacity-* classes.
const InterviewIllustration = ({ className = '' }) => (
  <svg
    viewBox="0 0 1200 640"
    fill="none"
    stroke="currentColor"
    strokeWidth="5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Interviewer's question bubble */}
    <path d="M80 110h150a20 20 0 0 1 20 20v80a20 20 0 0 1-20 20H130l-30 28v-28H80a20 20 0 0 1-20-20v-80a20 20 0 0 1 20-20z" />
    <path d="M140 152a16 16 0 1 1 20 16c-5 2-7 5-7 10" />
    <circle cx="153" cy="194" r="3" fill="currentColor" />

    {/* Timer */}
    <circle cx="170" cy="470" r="42" />
    <path d="M170 442v28l18 12M158 418h24" />

    {/* Candidate's reply bubble */}
    <path d="M1120 300H970a20 20 0 0 0-20 20v80a20 20 0 0 0 20 20h100l30 28v-28h20a20 20 0 0 0 20-20v-80a20 20 0 0 0-20-20z" />
    <path d="M975 340h120M975 365h90M975 390h105" strokeWidth="4" />

    {/* Code brackets */}
    <path d="M985 130l-25 25 25 25M1045 130l25 25-25 25M1027 122l-20 66" />

    {/* Microphone, below the form */}
    <rect x="565" y="460" width="70" height="110" rx="35" />
    <path d="M582 490h36M582 515h36M582 540h36" strokeWidth="4" />
    <path d="M528 525a72 72 0 0 0 144 0" />
    <path d="M600 597v31M560 628h80" />

    {/* Sound waves */}
    <path d="M500 485a80 80 0 0 0 0 90M470 465a110 110 0 0 0 0 130" strokeWidth="4" />
    <path d="M700 485a80 80 0 0 1 0 90M730 465a110 110 0 0 1 0 130" strokeWidth="4" />

    {/* Sparkles */}
    <path d="M1130 95v30M1115 110h30M150 315v30M135 330h30" strokeWidth="4" />
    <circle cx="1010" cy="240" r="5" fill="currentColor" stroke="none" />
    <circle cx="240" cy="390" r="5" fill="currentColor" stroke="none" />
    <circle cx="380" cy="560" r="5" fill="currentColor" stroke="none" />
    <circle cx="830" cy="600" r="5" fill="currentColor" stroke="none" />
  </svg>
);

export default InterviewIllustration;
