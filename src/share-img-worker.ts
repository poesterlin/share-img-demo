import { ProfilePainter, SharePainter, CleanupPainter, Painter } from './canvas-painters'

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

export const width = 1080
export const height = 1080

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
