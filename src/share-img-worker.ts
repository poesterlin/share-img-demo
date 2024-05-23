// The payload that the worker receives from the main thread
export type SharePayload = { text: string; images: string[] }

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

// setup listener for messages from the main thread
onmessage = async (e) => {
  console.time('Worker')

  // get the payload from the event data
  const payload = e.data as SharePayload

  // fetch the images from the payload and convert them to ImageBitmaps
  const imageRequests = payload.images.map((url) =>
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob))
  )

  // wait for all the image requests to complete
  const responses = await Promise.allSettled(imageRequests)

  // find the first successful response
  const completedResponse = responses.find((result) => result.status === 'fulfilled') as
    | PromiseFulfilledResult<ImageBitmap>
    | undefined
  assert(completedResponse, 'Failed to get response')

  // create a canvas with the same dimensions as the first image
  const bitmap = completedResponse.value
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  assert(ctx, 'Failed to get context')

  for (const result of responses) {
    // skip failed requests
    if (result.status === 'rejected') {
      console.error(result.reason)
      continue
    }

    // draw the image on the canvas
    const image = result.value
    ctx.drawImage(image, 0, 0)

    // close the image to free up memory
    image.close()
  }

  // draw the text on the canvas
  ctx.font = '48px sans-serif'
  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(payload.text, canvas.width / 2, canvas.height / 2)

  const blob = await canvas.convertToBlob({ type: 'image/png', quality: 0.95 })
  const url = URL.createObjectURL(blob)

  // return the URL to the main thread
  postMessage(url)
  console.timeEnd('Worker')
}
