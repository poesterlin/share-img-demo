import { drawText, drawUnit, drawTextCentered } from './canvas-helpers'
import { height, width, type SharePayload } from './share-img-worker'

declare const self: WindowOrWorkerGlobalScope & { fonts: Set<FontFace> }
const SPACING = 40

const assets = {
  monsterBackground: '/img/monster-background.png',
  shareBackground: '/img/share-background.png',
  cleanupBackground: '/img/cleanup-background.png',
  chrome: '/img/chrome.png',
  monsters: [
    '/img/social-share-monster-1.png',
    '/img/social-share-monster-2.png',
    '/img/social-share-monster-3.png',
    '/img/social-share-monster-4.png'
  ]
}

export abstract class Painter {
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

  /**
   * Draws the chrome around the image.
   * Preloads the fonts and draws the profile name and team name.
   */
  protected async drawChrome() {
    await this.loadFonts()
    const { profile } = this.payload

    // NAME    TEAM
    // ___     ___

    const x1 = 383
    const y1 = 950

    const x2 = 704
    const y2 = y1 + SPACING

    // draw the profile name
    drawText(this.ctx, 'NAME', x1, y1, 'light')
    drawText(this.ctx, profile.name.toLocaleUpperCase(), x1, y2, 'bold', { max: 300 })

    // draw the team name
    drawText(this.ctx, 'TEAM', x2, y1, 'light')
    drawText(this.ctx, profile.team.toLocaleUpperCase(), x2, y2, 'bold', { max: 300 })
  }

  abstract draw(): Promise<void>
}

export class ProfilePainter extends Painter {
  getBackgroundLayers(): string[] {
    if (this.payload.type !== 'profile') {
      throw new Error('Invalid payload type')
    }

    return [assets.monsterBackground, assets.monsters[this.payload.monster - 1], assets.chrome]
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
    const scale = 0.7
    const center = (width - monster.width * scale) / 2
    this.ctx.drawImage(monster, center, 180, monster.width * scale, monster.height * scale)

    // border
    this.ctx.drawImage(border, 0, 0, width, height)

    // cleanup the images from memory
    backgrounds.forEach((image) => image.close())

    await this.drawChrome()

    const { profile, share } = this.payload

    //          area
    //          ___
    //  LEVEL
    //  ___     volume
    //          ___

    const x1 = 122
    drawText(this.ctx, 'LEVEL', x1, 615, 'big')
    drawText(this.ctx, profile.level.toString(), x1, 700, 'big')

    const x2 = 585
    const y1 = 566
    const y2 = 706

    drawText(this.ctx, 'GEREINIGTE FLÄCHE', x2, y1, 'light')
    drawUnit(this.ctx, share.area, 'm²', x2, y1 + SPACING)

    drawText(this.ctx, 'GESAMMELTER MÜLL', x2, y2, 'light')
    drawUnit(this.ctx, share.volume, 'Liter', x2, y2 + SPACING)
  }
}

export class SharePainter extends Painter {
  getBackgroundLayers(): string[] {
    return [assets.shareBackground]
  }

  async draw() {
    if (this.payload.type !== 'share') {
      throw new Error('Invalid payload type')
    }

    const [background] = await this.fetchBackgroundAssets()
    this.ctx.drawImage(background, 0, 0)
    background.close()

    await this.drawChrome()
    const { share } = this.payload

    //              area
    //  MÜLL        ___
    //  ENTSORGT
    //              volume
    //              ___

    const x1 = 111
    drawText(this.ctx, 'MÜLL', x1, 634, 'big')
    drawText(this.ctx, 'ENTSORGT', x1, 719, 'big')

    const x2 = 585
    const y1 = 566
    const y2 = 706

    drawText(this.ctx, 'GEREINIGTE FLÄCHE', x2, y1, 'light')
    drawUnit(this.ctx, share.area, 'm²', x2, y1 + SPACING)

    drawText(this.ctx, 'GESAMMELTER MÜLL', x2, y2, 'light')
    drawUnit(this.ctx, share.volume, 'Liter', x2, y2 + SPACING)
  }
}

export class CleanupPainter extends Painter {
  getBackgroundLayers(): string[] {
    return [assets.cleanupBackground]
  }

  async draw() {
    if (this.payload.type !== 'cleanup') {
      throw new Error('Invalid payload type')
    }

    const [background] = await this.fetchBackgroundAssets()
    this.ctx.drawImage(background, 0, 0)
    background.close()

    await this.drawChrome()

    //        TITLE
    //       _______
    //
    // volume         area
    // participants   impact

    const { cleanup } = this.payload
    const xMin = 90
    const xMax = width - xMin * 2
    drawTextCentered(this.ctx, 'ERFOLGREICHES CLEANUP', xMin, 390, 'light-big', xMax)
    drawTextCentered(this.ctx, cleanup.name.toLocaleUpperCase(), xMin, 444, 'big', xMax)

    const x1 = 152
    const y1 = 590
    const x2 = 585
    const y2 = 748

    drawText(this.ctx, 'MÜLLMENGE', x1, y1, 'light')
    drawUnit(this.ctx, cleanup.volume, 'Liter', x1, y1 + SPACING)

    drawText(this.ctx, 'TEILNEHMENDE', x1, y2, 'light')
    drawUnit(this.ctx, cleanup.participants, 'Grabits', x1, y2 + SPACING)

    drawText(this.ctx, 'GEREINIGTE FLÄCHE', x2, y1, 'light')
    drawUnit(this.ctx, cleanup.area, 'm²', x2, y1 + SPACING)

    drawText(this.ctx, 'GESAMTER IMPACT', x2, y2, 'light')
    drawUnit(this.ctx, cleanup.impact, 'Points', x2, y2 + SPACING)
  }
}
