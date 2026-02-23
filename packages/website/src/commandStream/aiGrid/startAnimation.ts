const GRID_SPACING = 36
const DOT_BASE_RADIUS = 1.4
const DOT_DENSITY = 1.0
const WAVE_SPEED = 0.05
const WAVE_LENGTH = 250
const WAVE_AMPLITUDE = 20
const WAVE_COLOR_BLEND = 0.6

const DOT_RGB = {
  dark: [80, 50, 70] as const,
  light: [220, 215, 220] as const,
}

const WAVE_RGB = {
  dark: [255, 105, 180] as const,
  light: [219, 39, 119] as const,
}

const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount

const waveIntensity = (distance: number, time: number): number => {
  const phase = (distance - time * WAVE_SPEED) / WAVE_LENGTH
  return (Math.sin(phase * Math.PI * 2) + 1) / 2
}

const dotHash = (gridX: number, gridY: number): number => {
  const n = Math.sin(gridX * 127.1 + gridY * 311.7) * 43758.5453
  return n - Math.floor(n)
}

export const startAnimation = (
  canvas: HTMLCanvasElement,
): (() => void) => {
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return () => {}
  }

  let animationId = 0
  const dpr = window.devicePixelRatio || 1

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const draw = (timestamp: number): void => {
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const centerX = width / 2
    const centerY = height / 2

    ctx.clearRect(0, 0, width, height)

    const isDark = document.documentElement.classList.contains('dark')
    const theme = isDark ? 'dark' : 'light'
    const baseRgb = DOT_RGB[theme]
    const waveRgb = WAVE_RGB[theme]

    let gridX = 0
    for (let x = GRID_SPACING / 2; x < width; x += GRID_SPACING) {
      let gridY = 0
      for (let y = GRID_SPACING / 2; y < height; y += GRID_SPACING) {
        gridY++
        if (dotHash(gridX, gridY) > DOT_DENSITY) {
          continue
        }
        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        const totalIntensity = waveIntensity(distance, timestamp)

        const push = totalIntensity * WAVE_AMPLITUDE
        const angle = Math.atan2(dy, dx)
        const offsetX = Math.cos(angle) * push
        const offsetY = Math.sin(angle) * push
        const radius = DOT_BASE_RADIUS + totalIntensity * 0.15

        const colorBlend = totalIntensity * WAVE_COLOR_BLEND
        const red = lerp(baseRgb[0], waveRgb[0], colorBlend)
        const green = lerp(baseRgb[1], waveRgb[1], colorBlend)
        const blue = lerp(baseRgb[2], waveRgb[2], colorBlend)
        const horizontalCenter = Math.abs(dx) / (width / 2)
        const centerFade =
          horizontalCenter < 0.33
            ? 0.3
            : Math.min((horizontalCenter - 0.33) / 0.33, 1)
        const opacity = (0.85 + totalIntensity * 0.15) * centerFade

        ctx.beginPath()
        ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${opacity})`
        ctx.fill()
      }
      gridX++
    }

    animationId = requestAnimationFrame(draw)
  }

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  resize()
  window.addEventListener('resize', resize)

  if (prefersReducedMotion) {
    draw(0)
    return () => {
      window.removeEventListener('resize', resize)
    }
  }

  animationId = requestAnimationFrame(draw)

  return () => {
    cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
  }
}
