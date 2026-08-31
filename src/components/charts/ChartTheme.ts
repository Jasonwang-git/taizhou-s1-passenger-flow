export const darkChartTheme = {
  backgroundColor: 'transparent',
  textStyle: { color: '#94a3b8' },
  animation: true,
  animationDuration: 600,
}

export const chartColors = {
  cyan: '#22d3ee',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  purple: '#a78bfa',
  blue: '#60a5fa',
}

/** 霓虹发光折线样式 */
export function glowLine(color: string, width = 2) {
  return {
    width,
    color,
    shadowBlur: 10,
    shadowColor: color,
  }
}

/** 渐变面积填充 */
export function glowArea(color: string, opacity = 0.18) {
  return {
    color: {
      type: 'linear' as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` },
        { offset: 1, color: `${color}00` },
      ],
    },
  }
}
