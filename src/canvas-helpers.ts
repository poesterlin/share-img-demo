type FontStyle = 'light' | 'light-big' | 'bold' | 'number' | 'unit' | 'big'

/**
 * Sets up the text rendering context.
 * @param ctx
 * @param font
 */
export function setupText(ctx: OffscreenCanvasRenderingContext2D, font: FontStyle) {
  ctx.textBaseline = 'top'

  if (font === 'light') {
    ctx.font = '28px Montserrat'
    ctx.fillStyle = '#01687F'
  }

  if (font === 'light-big') {
    ctx.font = '32px Montserrat'
    ctx.fillStyle = '#01687F'
  }

  if (font === 'bold') {
    ctx.font = '56px Bebas Neue'
    ctx.fillStyle = 'white'
  }

  if (font === 'number') {
    ctx.font = '76px Bebas Neue'
    ctx.fillStyle = 'white'
  }

  if (font === 'unit') {
    ctx.font = '32px Montserrat'
    ctx.fillStyle = 'white'
    ctx.textBaseline = 'bottom'
  }

  if (font === 'big') {
    ctx.font = '92px Bebas Neue'
    ctx.fillStyle = 'white'
  }
}

/**
 * Draws text on the canvas at the specified position.
 *
 * @param ctx
 * @param text
 * @param x
 * @param y
 * @returns dimensions of the text
 */
export function drawText(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: FontStyle,
  options?: { max?: number }
) {
  setupText(ctx, font)
  let measurement: TextMetrics

  // scale the font size if the text is too wide
  if (options?.max) {
    const scale = scaleText(ctx, text, options.max)
    y += scale.offsetY
    measurement = scale.measurement
  } else {
    measurement = ctx.measureText(text)
  }

  ctx.fillText(text, x, y)

  return { width: measurement.width, height: getHeight(measurement) }
}

/**
 * Draws text on the canvas at the specified position.
 * @param ctx
 * @param text
 * @param x
 * @param y
 * @param font
 * @param width Width of the area where the text should be centered
 */
export function drawTextCentered(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: FontStyle,
  width: number
) {
  setupText(ctx, font)
  const scale = scaleText(ctx, text, width)
  const textWidth = scale.measurement.width
  const textX = x + (width - textWidth) / 2
  ctx.fillText(text, textX, y + scale.offsetY)
}

/**
 *
 * @param ctx
 * @param value
 * @param unit
 * @param x
 * @param y
 */
export function drawUnit(
  ctx: OffscreenCanvasRenderingContext2D,
  value: number,
  unit: string,
  x: number,
  y: number
) {
  const { width, height } = drawText(ctx, value.toLocaleString('de-DE'), x, y, 'number')
  drawText(ctx, unit, x + width + 10, y + height, 'unit')
}

export function getHeight(measurement: TextMetrics) {
  const { actualBoundingBoxDescent, actualBoundingBoxAscent } = measurement
  return actualBoundingBoxDescent + Math.abs(actualBoundingBoxAscent)
}

export function scaleText(ctx: OffscreenCanvasRenderingContext2D, text: string, maxWidth: number) {
  const measurement = ctx.measureText(text)
  if (measurement.width < maxWidth) {
    return { measurement, offsetY: 0 }
  }

  const ratio = maxWidth / measurement.width

  const [size, font] = ctx.font.split('px ')
  ctx.font = `${parseInt(size) * ratio}px ${font}`

  const measurementAfter = ctx.measureText(text)
  const height = getHeight(measurement)
  const heightAfter = getHeight(measurementAfter)

  const offsetY = (height - heightAfter) / 4
  return { measurement: measurementAfter, offsetY }
}
