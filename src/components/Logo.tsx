import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  brandName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
  onClick,
  brandName = 'FezGuideTours',
}) => {
  const iconDimensions = {
    sm: { width: 34, height: 38 },
    md: { width: 44, height: 48 },
    lg: { width: 56, height: 62 },
  }[size];

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }[size];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`inline-flex items-center gap-2.5 max-[360px]:gap-1.5 select-none ${onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''} ${className}`}
      aria-label={`${brandName} Logo`}
      onKeyDown={onClick ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); } } : undefined}
    >
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={iconDimensions.width}
          height={iconDimensions.height}
          viewBox="0 0 120 135"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xs max-[360px]:w-[34px] max-[360px]:h-[38px]"
        >
          {/* Main Pin Teardrop Body */}
          <path
            d="M60 130 C45 105 20 75 20 48 C20 26 38 8 60 8 C82 8 100 26 100 48 C100 75 75 105 60 130 Z"
            fill="#005F5A"
          />

          {/* Inner cutout for contrast */}
          <path
            d="M60 115 C48 94 28 68 28 48 C28 30 42 16 60 16 C78 16 92 30 92 48 C92 68 72 94 60 115 Z"
            fill="#FFFFFF"
          />

          {/* Bab Boujloud Moorish Gate Silhouette inside Pin */}
          {/* Gate Main Archway (Keyhole / Horseshoe Arch) */}
          <path
            d="M60 40 C52 40 46 45 46 53 C46 58 48 61 51 64 L51 86 L69 86 L69 64 C72 61 74 58 74 53 C74 45 68 40 60 40 Z"
            fill="#005F5A"
          />
          {/* Inner Horseshoe cutout */}
          <path
            d="M60 46 C55 46 51 49 51 54 C51 58 53 60 55 62 L55 86 L65 86 L65 62 C67 60 69 58 69 54 C69 49 65 46 60 46 Z"
            fill="#FFFFFF"
          />

          {/* Gate crenellations / battlements on top */}
          <path
            d="M40 37 H80 V42 H76 V40 H72 V42 H68 V40 H64 V42 H60 V40 H56 V42 H52 V40 H48 V42 H44 V40 H40 Z"
            fill="#005F5A"
          />

          {/* Side Gate Pillars & Windows */}
          <rect x="36" y="42" width="6" height="44" rx="1" fill="#005F5A" />
          <rect x="78" y="42" width="6" height="44" rx="1" fill="#005F5A" />
          <path
            d="M38 52 C38 50 40 48 41 48 C42 48 44 50 44 52 L44 60 L38 60 Z"
            fill="#FFFFFF"
          />
          <path
            d="M80 52 C80 50 82 48 83 48 C84 48 86 50 86 52 L86 60 L80 60 Z"
            fill="#FFFFFF"
          />

          {/* Traditional Moroccan Red Fez Hat (Tarboush / Chechia) tilted at top left */}
          <g transform="translate(14, 0) rotate(-12 35 25)">
            {/* Fez Hat Body (Trapezoid) */}
            <path
              d="M20 34 L26 10 L50 10 L56 34 Z"
              fill="#C84B31"
            />
            {/* Black base rim */}
            <path
              d="M19 34 L57 34 L57 36 L19 36 Z"
              fill="#1C2524"
            />
            {/* Tassel Button on top */}
            <circle cx="38" cy="9" r="2.5" fill="#005F5A" />
            {/* Hanging Tassel string & fringe */}
            <path
              d="M38 10 C46 12 56 18 56 26"
              stroke="#005F5A"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* Tassel Bell / Fringe */}
            <path
              d="M53 26 C53 24 59 24 59 26 L61 36 C61 37 51 37 51 36 Z"
              fill="#005F5A"
            />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex items-center tracking-tight font-extrabold whitespace-nowrap">
          {brandName === 'FezGuideTours' ? <><span className={`text-[#005F5A] font-bold ${textSizes} max-[360px]:text-lg`}>FezGuide</span><span className={`text-[#C84B31] font-bold ${textSizes} max-[360px]:text-lg`}>Tours</span></> : <span className={`text-[#005F5A] font-bold ${textSizes} max-[360px]:text-lg`}>{brandName}</span>}
        </div>
      )}
    </div>
  );
};
