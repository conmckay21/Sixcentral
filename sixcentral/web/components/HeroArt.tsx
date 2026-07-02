import type { Motif } from '@/lib/types';

/**
 * HeroArt: SixCentral's original editorial artwork system.
 *
 * Every article hero is generated, original art: a synthwave sky pulled from
 * the article's own gradient, a slatted retro sun, and a per-article motif
 * silhouette. No screenshots, no third-party IP. The imagery is ours.
 *
 * Renders absolutely inside a positioned container (.card__media,
 * .article__hero, .row-item__thumb).
 */

const INK = '#0B0810';

function hexesFrom(gradient?: string): [string, string] {
  const found = (gradient ?? '').match(/#[0-9a-fA-F]{6}/g);
  if (found && found.length >= 2) return [found[0], found[found.length - 1]];
  return ['#FF2E88', '#8A4FFF'];
}

function Silhouette({ motif, accent }: { motif: Motif; accent: string }) {
  const s: React.CSSProperties = { fill: INK, stroke: accent, strokeWidth: 2 };
  const line: React.CSSProperties = { fill: 'none', stroke: accent, strokeWidth: 2.5, opacity: 0.85 };

  switch (motif) {
    case 'skyline':
      return (
        <g>
          <rect x="40" y="230" width="52" height="120" style={s} />
          <rect x="104" y="190" width="64" height="160" style={s} />
          <rect x="180" y="250" width="44" height="100" style={s} />
          <rect x="560" y="210" width="58" height="140" style={s} />
          <rect x="630" y="256" width="46" height="94" style={s} />
          <line x1="136" y1="190" x2="136" y2="150" style={line} />
          <path d="M700 350 C 700 300 706 280 712 260 M712 260 C 690 268 680 276 672 288 M712 260 C 716 244 722 236 734 228 M712 260 C 728 262 742 270 750 282 M712 260 C 700 242 692 238 678 234" style={line} />
        </g>
      );
    case 'palms':
      return (
        <g>
          <path d="M180 350 C 182 300 188 272 198 244 M198 244 C 168 250 152 262 140 280 M198 244 C 176 226 158 222 138 224 M198 244 C 204 220 214 208 232 200 M198 244 C 226 234 248 238 264 250 M198 244 C 222 252 238 266 246 284" style={line} />
          <path d="M600 350 C 598 292 592 264 580 238 M580 238 C 610 242 628 254 640 272 M580 238 C 602 220 622 216 642 220 M580 238 C 572 214 562 202 544 196 M580 238 C 552 228 530 232 514 244" style={line} />
          <ellipse cx="390" cy="352" rx="330" ry="10" fill={INK} opacity="0.9" />
        </g>
      );
    case 'cassette':
      return (
        <g>
          <rect x="250" y="180" width="300" height="180" rx="14" style={s} />
          <rect x="278" y="206" width="244" height="70" rx="8" fill="none" stroke={accent} strokeWidth="2" opacity="0.9" />
          <circle cx="330" cy="241" r="20" style={s} />
          <circle cx="470" cy="241" r="20" style={s} />
          <line x1="322" y1="241" x2="338" y2="241" style={line} />
          <line x1="462" y1="241" x2="478" y2="241" style={line} />
          <path d="M310 360 L 330 312 L 470 312 L 490 360" fill="none" stroke={accent} strokeWidth="2" opacity="0.7" />
        </g>
      );
    case 'disc':
      return (
        <g>
          <circle cx="330" cy="260" r="86" style={s} />
          <circle cx="330" cy="260" r="26" fill="none" stroke={accent} strokeWidth="2.5" />
          <circle cx="330" cy="260" r="56" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.5" strokeDasharray="6 8" />
          <rect x="440" y="216" width="180" height="88" rx="10" style={s} />
          <line x1="462" y1="244" x2="560" y2="244" style={line} strokeDasharray="10 8" />
          <line x1="462" y1="268" x2="598" y2="268" style={line} strokeDasharray="10 8" />
          <line x1="462" y1="284" x2="530" y2="284" style={line} strokeDasharray="10 8" />
        </g>
      );
    case 'money':
      return (
        <g>
          <rect x="300" y="286" width="200" height="52" rx="8" style={s} transform="rotate(-4 400 312)" />
          <rect x="292" y="242" width="200" height="52" rx="8" style={s} transform="rotate(2 392 268)" />
          <rect x="300" y="196" width="200" height="52" rx="8" style={s} />
          <rect x="380" y="196" width="40" height="52" fill="none" stroke={accent} strokeWidth="2" opacity="0.9" />
          <circle cx="560" cy="318" r="26" style={s} />
          <circle cx="588" cy="330" r="26" style={s} />
        </g>
      );
    case 'map':
      return (
        <g>
          <path d="M120 340 C 200 300 260 320 330 296 C 400 272 470 292 560 262 C 620 242 660 250 700 236" style={line} opacity="0.5" />
          <path d="M140 302 C 220 268 300 284 380 256 C 460 228 540 250 640 214" style={line} opacity="0.35" />
          <g>
            <circle cx="300" cy="250" r="14" style={s} />
            <path d="M300 264 L 300 292" style={line} />
          </g>
          <g>
            <circle cx="480" cy="216" r="14" style={s} />
            <path d="M480 230 L 480 258" style={line} />
          </g>
          <g>
            <circle cx="600" cy="286" r="14" style={s} />
            <path d="M600 300 L 600 328" style={line} />
          </g>
        </g>
      );
    case 'signal':
      return (
        <g>
          <path d="M360 350 L 400 170 L 440 350 Z" fill="none" stroke={accent} strokeWidth="2.5" />
          <line x1="376" y1="290" x2="424" y2="290" style={line} />
          <line x1="368" y1="322" x2="432" y2="322" style={line} />
          <line x1="384" y1="252" x2="416" y2="252" style={line} />
          <path d="M430 180 C 446 168 462 168 478 180" style={line} opacity="0.8" />
          <path d="M438 200 C 462 182 486 182 510 200" style={line} opacity="0.5" />
          <path d="M370 180 C 354 168 338 168 322 180" style={line} opacity="0.8" />
          <path d="M362 200 C 338 182 314 182 290 200" style={line} opacity="0.5" />
          <circle cx="400" cy="170" r="6" fill={accent} />
        </g>
      );
    case 'phone':
      return (
        <g>
          <rect x="330" y="150" width="140" height="216" rx="22" style={s} />
          <rect x="352" y="182" width="96" height="140" rx="6" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <circle key={`${r}${c}`} cx={372 + c * 28} cy={206 + r * 34} r="7" fill="none" stroke={accent} strokeWidth="2" opacity="0.85" />
            )),
          )}
          <line x1="378" y1="164" x2="422" y2="164" style={line} />
        </g>
      );
    case 'controller':
      return (
        <g>
          <path d="M300 230 C 300 200 330 190 400 190 C 470 190 500 200 500 230 C 512 260 516 300 504 322 C 494 340 472 338 458 318 L 442 292 L 358 292 L 342 318 C 328 338 306 340 296 322 C 284 300 288 260 300 230 Z" style={s} />
          <line x1="345" y1="242" x2="345" y2="270" style={line} />
          <line x1="331" y1="256" x2="359" y2="256" style={line} />
          <circle cx="452" cy="244" r="8" fill="none" stroke={accent} strokeWidth="2.5" />
          <circle cx="474" cy="266" r="8" fill="none" stroke={accent} strokeWidth="2.5" />
        </g>
      );
    case 'pc':
      return (
        <g>
          <rect x="270" y="180" width="200" height="130" rx="10" style={s} />
          <line x1="330" y1="310" x2="330" y2="336" style={line} />
          <line x1="410" y1="310" x2="410" y2="336" style={line} />
          <line x1="300" y1="338" x2="440" y2="338" style={line} />
          <rect x="500" y="170" width="80" height="170" rx="8" style={s} />
          <line x1="516" y1="196" x2="564" y2="196" style={line} />
          <line x1="516" y1="214" x2="564" y2="214" style={line} />
          <circle cx="540" cy="304" r="10" fill="none" stroke={accent} strokeWidth="2.5" />
        </g>
      );
    case 'globe':
      return (
        <g>
          <circle cx="400" cy="256" r="92" fill="none" stroke={accent} strokeWidth="2.5" opacity="0.9" />
          <ellipse cx="400" cy="256" rx="92" ry="34" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <ellipse cx="400" cy="256" rx="40" ry="92" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <circle cx="330" cy="212" r="6" fill={accent} />
          <circle cx="472" cy="232" r="6" fill={accent} />
          <circle cx="418" cy="330" r="6" fill={accent} />
          <line x1="330" y1="212" x2="472" y2="232" style={line} opacity="0.5" />
          <line x1="472" y1="232" x2="418" y2="330" style={line} opacity="0.5" />
        </g>
      );
    case 'question':
      return (
        <g>
          <text
            x="400"
            y="316"
            textAnchor="middle"
            style={{ fontFamily: 'Anton, Impact, sans-serif', fontSize: 220, fill: INK, stroke: accent, strokeWidth: 3 }}
          >
            ?
          </text>
        </g>
      );
    default:
      return null;
  }
}

export default function HeroArt({
  motif = 'skyline',
  gradient,
  compact = false,
}: {
  motif?: Motif;
  gradient?: string;
  compact?: boolean;
}) {
  const [from, to] = hexesFrom(gradient);
  const uid = `${motif}-${from.slice(1)}-${to.slice(1)}${compact ? '-c' : ''}`;

  return (
    <svg
      viewBox="0 0 800 450"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <linearGradient id={`sun-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFC83D" />
          <stop offset="100%" stopColor={from} />
        </linearGradient>
        <pattern id={`scan-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="2" fill={INK} opacity="0.16" />
        </pattern>
        <clipPath id={`slats-${uid}`}>
          <rect x="240" y="96" width="320" height="24" />
          <rect x="240" y="132" width="320" height="20" />
          <rect x="240" y="164" width="320" height="16" />
          <rect x="240" y="192" width="320" height="12" />
          <rect x="240" y="216" width="320" height="10" />
          <rect x="240" y="238" width="320" height="120" />
        </clipPath>
      </defs>

      {/* sky */}
      <rect width="800" height="450" fill={`url(#sky-${uid})`} />

      {/* slatted retro sun */}
      {!compact && (
        <circle cx="400" cy="256" r="150" fill={`url(#sun-${uid})`} opacity="0.9" clipPath={`url(#slats-${uid})`} />
      )}

      {/* horizon */}
      <rect x="0" y="350" width="800" height="100" fill={INK} opacity="0.92" />
      <line x1="0" y1="350" x2="800" y2="350" stroke={to} strokeWidth="2" opacity="0.9" />

      {/* motif silhouette */}
      <Silhouette motif={motif} accent={compact ? '#F4EFE8' : to} />

      {/* scanlines + vignette */}
      <rect width="800" height="450" fill={`url(#scan-${uid})`} />
      <rect width="800" height="450" fill={INK} opacity="0.08" />
    </svg>
  );
}
