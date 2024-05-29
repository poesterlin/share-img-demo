// The payload that the worker receives from the main thread
export type SharePayload =
  | {
      monster: number
      type: 'profile'
      profile: {
        name: string
        team: string
        level: number
      }
      share: {
        area: number
        volume: number
      }
    }
  | {
      type: 'share'
      profile: {
        name: string
        team: string
      }
      share: {
        area: number
        volume: number
      }
    }
  | {
      monster?: number
      type: 'cleanup'
      profile: {
        name: string
        team: string
      }
      cleanup: {
        area: number
        volume: number
        impact: number
        participants: number
        name: string
      }
    }

declare const self: WindowOrWorkerGlobalScope & { fonts: Set<FontFace> }

/**
 * Asserts that the condition is true, otherwise throws an error with the message.
 * @param condition
 * @param message
 */
function assert<T>(condition: T | undefined | null, message: string): asserts condition is T {
  if (!condition) {
    throw new Error(message)
  }
}

const layers = {
  backgroundMonster: '/img/social-share-background.png',
  background: '/img/social-share-background.png',
  border: '/img/social-share-border.png',
  monsters: [
    '/img/social-share-monster-1.png',
    '/img/social-share-monster-2.png',
    '/img/social-share-monster-3.png',
    '/img/social-share-monster-4.png'
  ]
}

const width = 1080
const height = 1080

// setup listener for messages from the main thread
onmessage = async (e) => {
  console.time('Worker')

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  assert(ctx, 'Failed to get context')

  // get the payload from the event data
  const payload = e.data as SharePayload

  const painter = getPainter(ctx, payload)

  await painter.draw()

  const blob = await canvas.convertToBlob({ type: 'image/png', quality: 0.95 })
  const url = URL.createObjectURL(blob)

  // return the URL to the main thread
  postMessage(url)
  console.timeEnd('Worker')
}

abstract class Painter {
  constructor(
    protected ctx: OffscreenCanvasRenderingContext2D,
    protected payload: SharePayload
  ) {}

  protected async loadFonts() {
    const montserrat = new FontFace('Montserrat', 'url(/fonts/Montserrat-Regular.ttf)')
    const bebasNeue = new FontFace('Bebas Neue', 'url(/fonts/BebasNeue-Regular.ttf)')

    self.fonts.add(montserrat)
    self.fonts.add(bebasNeue)

    await Promise.all([montserrat.load(), bebasNeue.load()])
  }

  protected async fetchBackgroundAssets(): Promise<ImageBitmap[]> {
    const images = this.getBackgroundLayers()

    // fetch the images from the payload and convert them to ImageBitmaps
    const imageRequests = images.map((url) =>
      fetch(url)
        .then((response) => response.blob())
        .then((blob) => createImageBitmap(blob))
    )

    // wait for all the image requests to complete
    const responses = await Promise.allSettled(imageRequests)
    const results = responses.map((result) => {
      if (result.status === 'rejected') {
        throw result.reason
      }
      return result.value
    })

    return results
  }

  abstract getBackgroundLayers(): string[]

  protected async drawChrome() {
    await this.loadFonts()
    const { profile } = this.payload

    // draw the profile name
    drawText(this.ctx, 'NAME', 383, 950, 'light')
    drawText(this.ctx, profile.name.toLocaleUpperCase(), 383, 986, 'bold')

    // draw the team name
    drawText(this.ctx, 'TEAM', 704, 950, 'light')
    drawText(this.ctx, profile.team.toLocaleUpperCase(), 704, 986, 'bold')
  }

  abstract draw(): Promise<void>
}

class ProfilePainter extends Painter {
  getBackgroundLayers(): string[] {
    if (this.payload.type !== 'profile') {
      throw new Error('Invalid payload type')
    }

    return [layers.backgroundMonster, layers.monsters[this.payload.monster - 1], layers.border]
  }

  async draw() {
    if (this.payload.type !== 'profile') {
      throw new Error('Invalid payload type')
    }

    const backgrounds = await this.fetchBackgroundAssets()
    const [background, monster, border] = backgrounds

    // background
    this.ctx.drawImage(background, 0, 0)

    // center monster and scale to 150%
    const scale = 1.5
    const center = (width - monster.width * scale) / 2
    this.ctx.drawImage(monster, center, 200, monster.width * scale, monster.height * scale)

    // border
    this.ctx.drawImage(border, 0, 0, width, height)

    await this.drawChrome()

    const { profile } = this.payload

    drawText(this.ctx, 'LEVEL', 122, 615, 'big')
    drawText(this.ctx, profile.level.toString(), 122, 700, 'big')

    const { share } = this.payload

    drawText(this.ctx, 'GEREINIGTE FLÄCHE', 585, 566, 'light')
    drawUnit(this.ctx, share.area, 'm²', 585, 600)

    drawText(this.ctx, 'GESAMMELTER MÜLL', 585, 706, 'light')
    drawUnit(this.ctx, share.volume, 'Liter', 585, 740)
  }
}

class SharePainter extends Painter {
  getBackgroundLayers(): string[] {
    // TODO: add layer
    return [layers.background, layers.border]
  }

  async draw() {
    if (this.payload.type !== 'share') {
      throw new Error('Invalid payload type')
    }

    const backgrounds = await this.fetchBackgroundAssets()
    backgrounds.forEach((image) => this.ctx.drawImage(image, 0, 0))

    await this.drawChrome()

    drawText(this.ctx, 'MÜLL', 111, 634, 'big')
    drawText(this.ctx, 'ENTSORGT', 111, 719, 'big')

    const { share } = this.payload

    drawText(this.ctx, 'GEREINIGTE FLÄCHE', 585, 566, 'light')
    drawUnit(this.ctx, share.area, 'm²', 585, 600)

    drawText(this.ctx, 'GESAMMELTER MÜLL', 585, 706, 'light')
    drawUnit(this.ctx, share.volume, 'Liter', 585, 740)
  }
}

class CleanupPainter extends Painter {
  getBackgroundLayers(): string[] {
    // TODO: add layer
    return [layers.background, layers.border]
  }

  async draw() {
    if (this.payload.type !== 'cleanup') {
      throw new Error('Invalid payload type')
    }

    const backgrounds = await this.fetchBackgroundAssets()
    backgrounds.forEach((image) => this.ctx.drawImage(image, 0, 0))

    await this.drawChrome()

    // TODO: move to background layer
    this.ctx.fillStyle = '#01212b'
    this.ctx.fillRect(71, 340, 960, 200)

    const { cleanup } = this.payload

    drawTextCentered(this.ctx, 'ERFOLGREICHES CLEANUP', 0, 390, 'light-big', width)
    drawTextCentered(this.ctx, cleanup.name.toLocaleUpperCase(), 0, 444, 'big', width)

    drawText(this.ctx, 'MÜLLMENGE', 152, 590, 'light')
    drawUnit(this.ctx, cleanup.volume, 'Liter', 152, 640 - 15)

    drawText(this.ctx, 'TEILNEHMENDE', 152, 748, 'light')
    drawUnit(this.ctx, cleanup.participants, 'Grabits', 152, 798 - 15)

    drawText(this.ctx, 'GEREINIGTE FLÄCHE', 585, 590, 'light')
    drawUnit(this.ctx, cleanup.area, 'm²', 585, 640 - 15)

    drawText(this.ctx, 'GESAMTER IMPACT', 585, 748, 'light')
    drawUnit(this.ctx, cleanup.impact, 'Points', 585, 798 - 15)
  }
}

function getPainter(ctx: OffscreenCanvasRenderingContext2D, payload: SharePayload): Painter {
  switch (payload.type) {
    case 'profile':
      return new ProfilePainter(ctx, payload)
    case 'share':
      return new SharePainter(ctx, payload)
    case 'cleanup':
      return new CleanupPainter(ctx, payload)
  }
}

type FontStyle = 'light' | 'light-big' | 'bold' | 'number' | 'unit' | 'big'

/**
 * Sets up the text rendering context.
 * @param ctx
 * @param font
 */
function setupText(ctx: OffscreenCanvasRenderingContext2D, font: FontStyle) {
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
 * @returns width of the text
 */
function drawText(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: FontStyle
) {
  setupText(ctx, font)

  ctx.fillText(text, x, y)

  const { width, actualBoundingBoxDescent, actualBoundingBoxAscent } = ctx.measureText(text)
  const height = actualBoundingBoxDescent + Math.abs(actualBoundingBoxAscent)

  return { width, height }
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
function drawTextCentered(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: FontStyle,
  width: number
) {
  setupText(ctx, font)
  const { width: textWidth } = ctx.measureText(text)
  const textX = x + (width - textWidth) / 2
  ctx.fillText(text, textX, y)
}

/**
 *
 * @param ctx
 * @param value
 * @param unit
 * @param x
 * @param y
 */
function drawUnit(
  ctx: OffscreenCanvasRenderingContext2D,
  value: number,
  unit: string,
  x: number,
  y: number
) {
  const { width, height } = drawText(ctx, value.toLocaleString('de-DE'), x, y, 'number')
  drawText(ctx, unit, x + width + 10, y + height, 'unit')
}
