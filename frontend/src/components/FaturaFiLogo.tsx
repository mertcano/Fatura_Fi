"use client";

export function FaturaFiLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FaturaFi"
    >
      {/* Gradient definition: terra (warm copper) */}
      <defs>
        <linearGradient id="ff-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C66B3D" />
          <stop offset="100%" stopColor="#874225" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="36" height="36" rx="10" fill="url(#ff-logo-gradient)" />

      {/* Invoice document — slightly tilted, abstracted */}
      <g transform="translate(8 7)">
        {/* Document body */}
        <rect
          x="0.75" y="0.75"
          width="13" height="17"
          rx="1.5"
          fill="#FAF7F2"
          fillOpacity="0.96"
        />
        {/* Document lines */}
        <line x1="3" y1="5" x2="11.5" y2="5" stroke="#C66B3D" strokeWidth="1" strokeLinecap="round" />
        <line x1="3" y1="8" x2="9" y2="8" stroke="#C66B3D" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.7" />
        <line x1="3" y1="11" x2="10" y2="11" stroke="#C66B3D" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.7" />
      </g>

      {/* Liquidity flow arrow — emanates from the document, curves up and right */}
      <path
        d="M 23 16 Q 27 14, 29 19 T 27 25"
        stroke="#FAF7F2"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.95"
      />
      {/* Arrow head */}
      <path
        d="M 25 23.5 L 27 25 L 25 27"
        stroke="#FAF7F2"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Small accent dot (liquidity = capital) */}
      <circle cx="29" cy="11" r="1.5" fill="#14B981" />
    </svg>
  );
}
