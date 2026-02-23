const GRID_SPACING = 24
const DOT_BASE_RADIUS = 1.2
const RIPPLE_SPEED = 0.09
const RIPPLE_WIDTH = 200
const RIPPLE_INTERVAL = 5000
const RIPPLE_COUNT = 2
const WAVE_AMPLITUDE = 14
const MAX_DISTANCE = 1200
const WAVE_COLOR_BLEND = 0.12

const DOT_RGB = {
  dark: [40, 48, 64] as const,
  light: [200, 205, 215] as const,
}

const WAVE_RGB = {
  dark: [139, 92, 246] as const,
  light: [124, 58, 237] as const,
}

const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount

const rippleIntensity = (
  distance: number,
  ripplePosition: number,
): number => {
  const distanceFromRipple = Math.abs(distance - ripplePosition)

  return distanceFromRipple < RIPPLE_WIDTH
    ? Math.cos((distanceFromRipple / RIPPLE_WIDTH) * Math.PI * 0.5)
    : 0
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

    for (let x = GRID_SPACING / 2; x < width; x += GRID_SPACING) {
      for (let y = GRID_SPACING / 2; y < height; y += GRID_SPACING) {
        const dx = x - centerX
        const dy = y - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)

        let totalIntensity = 0

        for (let ripple = 0; ripple < RIPPLE_COUNT; ripple++) {
          const rippleAge =
            (timestamp - ripple * RIPPLE_INTERVAL) * RIPPLE_SPEED
          const ripplePosition =
            rippleAge % (MAX_DISTANCE + RIPPLE_WIDTH)

          if (ripplePosition > 0) {
            const fadeIn = Math.min(ripplePosition / RIPPLE_WIDTH, 1)
            totalIntensity = Math.max(
              totalIntensity,
              rippleIntensity(distance, ripplePosition) * fadeIn,
            )
          }
        }

        const push = totalIntensity * WAVE_AMPLITUDE
        const angle = Math.atan2(dy, dx)
        const offsetX = Math.cos(angle) * push
        const offsetY = Math.sin(angle) * push
        const radius = DOT_BASE_RADIUS + totalIntensity * 0.3

        const colorBlend = totalIntensity * WAVE_COLOR_BLEND
        const red = lerp(baseRgb[0], waveRgb[0], colorBlend)
        const green = lerp(baseRgb[1], waveRgb[1], colorBlend)
        const blue = lerp(baseRgb[2], waveRgb[2], colorBlend)
        const opacity = 0.7 + totalIntensity * 0.05

        ctx.beginPath()
        ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${opacity})`
        ctx.fill()
      }
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
