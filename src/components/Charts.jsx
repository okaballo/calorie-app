// Hand-drawn SVG charts: no chart library, so nothing extra to download or cache.
// dir="ltr" keeps the axes and text anchors in place in the Arabic layout.
import { useId } from 'react'
import { fmt0, fmt1 } from '../lib/calc.js'
import { t, locale } from '../lib/i18n.js'

const W = 320
const H = 210
const LEFT = 38   // room for y-axis labels
const BOTTOM = 24 // room for x-axis labels
const TOP = 14

/**
 * Calorie bars with a dashed goal line. `bars` are { label, value, key? }.
 * Works for 7 to ~31 bars: with many bars they get thinner and only every
 * few x-axis labels are drawn so they never overlap.
 *
 * Pass `onSelect` to make bars that have a `key` tappable (the whole column,
 * so empty days can be picked too); it gets the tapped key. The `selected` key is highlighted and the
 * other bars are dimmed. Bars with `cheat: true` use the red/blue cheat day gradient.
 */
export function BarChart({ bars, goal, label = 'Calories chart', selected = null, onSelect }) {
  const max = Math.max(goal, ...bars.map((d) => (d.cheat ? 0 : d.value)), 1) * 1
  const plotH = H - TOP - BOTTOM
  const y = (v) => TOP + plotH * (1 - v / max)
  const slot = (W - LEFT) / bars.length
  const barW = slot * (bars.length > 14 ? 0.68 : 0.6)
  const radius = Math.min(5, barW / 2)
  const labelEvery = Math.ceil(bars.length / 12) // at most 12 labels

  return (
    <svg dir="ltr" viewBox={`0 0 ${W} ${H}`} className="w-full text-zinc-900 dark:text-white" role={onSelect ? 'group' : 'img'} aria-label={label}>
      <defs>
        <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b58ff2" />
          <stop offset="1" stopColor="#7851a9" />
        </linearGradient>
        <linearGradient id="bar-cheat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF3547" />
          <stop offset="1" stopColor="#6039AA" />
        </linearGradient>
        {/* Soft neon halo behind the bars. */}
        <filter id="bar-glow" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComponentTransfer in="blur" result="halo"><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
          <feMerge><feMergeNode in="halo" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={LEFT} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" strokeOpacity=".08" />
          <text x={LEFT - 6} y={y(max * f) + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity=".6">
            {fmt0(max * f)}
          </text>
        </g>
      ))}

      {/* Two passes over the bars. The glow filter sits on ONE group around
          all bars. Put on each bar, it allocated a full-chart offscreen buffer
          per bar (up to 31) and re-ran them all on every frame of the dim
          fade; two quick taps (overlapping fades) exhausted iOS GPU memory and
          WebKit dropped the page layer, so the screen went black. Dimming is
          also instant now, so nothing is re-filtered frame by frame. */}
      {bars.map((d, i) => {
        const isSelected = selected !== null && d.key === selected
        const dimmed = selected !== null && !isSelected
        return (
          <g key={i} opacity={dimmed ? 0.4 : 1}>
            {isSelected && (
              <rect x={LEFT + slot * i + 1} y={TOP - 4} width={slot - 2} height={H - TOP - 4} rx={6}
                fill="currentColor" fillOpacity=".07" />
            )}
            {d.cheat && (
              <rect x={LEFT + slot * i} y={TOP - 4} width={slot - 1} height={y(0) - TOP + 4}
                fill="url(#bar-cheat)" fillOpacity=".16" />
            )}
            {(i % labelEvery === 0 || isSelected) && (
              <text x={LEFT + slot * i + slot / 2} y={H - 7} textAnchor="middle" fontSize="10" fill="currentColor"
                fillOpacity={isSelected ? 1 : 0.6} fontWeight={isSelected ? 700 : 400}>
                {d.label}
              </text>
            )}
          </g>
        )
      })}
      <g filter="url(#bar-glow)">
        {bars.map((d, i) => {
          const h = Math.max(y(0) - y(d.value), 0)
          if (d.cheat || h <= 0) return null
          const dimmed = selected !== null && d.key !== selected
          return (
            <rect key={i} x={LEFT + slot * i + (slot - barW) / 2} y={y(d.value)} width={barW} height={h}
              rx={radius} fill="url(#bar)" fillOpacity={dimmed ? 0.4 : 1} />
          )
        })}
      </g>

      {goal > 0 && (
        <g>
          <line x1={LEFT} x2={W} y1={y(goal)} y2={y(goal)} stroke="currentColor" strokeOpacity=".45" strokeDasharray="5 4" />
          <text x={W} y={y(goal) - 4} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity=".6">
            {t('Goal {n}', { n: fmt0(goal) })}
          </text>
        </g>
      )}

      {/* Invisible full-height tap targets, drawn last so they sit on top. */}
      {onSelect && bars.map((d, i) => d.key && (
        <rect
          key={`hit-${d.key}`}
          x={LEFT + slot * i} y={0} width={slot} height={H} fill="transparent"
          role="button" tabIndex={0} style={{ cursor: 'pointer', outline: 'none' }}
          aria-label={`${d.label}: ${fmt0(d.value)} ${t('kcal')}${d.cheat ? `, ${t('Cheat Day')}` : ''}`}
          aria-pressed={d.key === selected}
          onClick={() => onSelect(d.key)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(d.key) } }}
        />
      ))}
    </svg>
  )
}

/** Weight trend: line with a soft fill. `points` are { date: 'YYYY-MM-DD', value }, oldest first. */
export function LineChart({ points, pad = 1.5, format = fmt1, label: ariaLabel = t('Weight trend') }) {
  // Unique ids: several charts can be mounted at once (every tab stays mounted).
  const uid = useId().replace(/:/g, '')
  const values = points.map((p) => p.value)
  const lo = Math.min(...values) - pad
  const hi = Math.max(...values) + pad
  const times = points.map((p) => new Date(p.date).getTime())
  const t0 = times[0]
  const span = times[times.length - 1] - t0

  const plotH = H - TOP - BOTTOM
  const plotW = W - LEFT - 8
  const x = (time) => (span === 0 ? LEFT + plotW / 2 : LEFT + ((time - t0) / span) * plotW)
  const y = (v) => TOP + plotH * (1 - (v - lo) / (hi - lo))

  const coords = points.map((p, i) => [x(times[i]), y(p.value)])
  const line = coords.map(([px, py]) => `${px},${py}`).join(' ')
  const area = `${coords[0][0]},${y(lo)} ${line} ${coords[coords.length - 1][0]},${y(lo)}`
  const label = (date) => new Date(date).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })

  return (
    <svg dir="ltr" viewBox={`0 0 ${W} ${H}`} className="w-full text-zinc-900 dark:text-white" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7851a9" stopOpacity=".45" />
          <stop offset="1" stopColor="#7851a9" stopOpacity="0" />
        </linearGradient>
        {/* Soft neon halo behind the trend line. userSpaceOnUse keeps it
            working even when the line is perfectly flat. */}
        <filter id={`line-glow-${uid}`} filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComponentTransfer in="blur" result="halo"><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
          <feMerge><feMergeNode in="halo" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {[0, 0.5, 1].map((f) => {
        const v = lo + (hi - lo) * f
        return (
          <g key={f}>
            <line x1={LEFT} x2={W} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity=".08" />
            <text x={LEFT - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity=".6">
              {format(v)}
            </text>
          </g>
        )
      })}

      <polygon points={area} fill={`url(#area-${uid})`} />
      <g filter={`url(#line-glow-${uid})`}>
        <polyline points={line} fill="none" stroke="#b58ff2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(([px, py], i) => <circle key={i} cx={px} cy={py} r="3.5" fill="#b58ff2" />)}
      </g>

      <text x={LEFT} y={H - 7} fontSize="10" fill="currentColor" fillOpacity=".6">{label(points[0].date)}</text>
      {span > 0 && (
        <text x={W - 8} y={H - 7} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity=".6">
          {label(points[points.length - 1].date)}
        </text>
      )}
    </svg>
  )
}
