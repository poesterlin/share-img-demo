<script setup lang="ts">
import type { SharePayload } from './share-img-worker';

// Import the file as a worker
import ShareWorker from './share-img-worker?worker';

async function generateShareImage() {
  if (!('share' in navigator)) {
    alert('Web Share API not supported')
    return
  }

  const worker = new ShareWorker();

  // listen for the worker to send back the data
  worker.onmessage = share;

  // send data to the worker
  worker.postMessage({
    text: "Check out Web Share API",
    images: [
      "/img/parallax0.png",
      "/img/parallax1.png",
      "/img/parallax2.png",
      "/img/parallax3.png",
      "/img/parallax4.png",
      "/img/parallax5.png",
      "/img/parallax6.png",
      "/img/parallax7.png",
    ]
  } satisfies SharePayload);
}

async function share(event: MessageEvent) {
  if (typeof event.data !== "string") {
    return;
  }

  const dataUrl = event.data;
  const request = await fetch(dataUrl);
  const blob = await request.blob();
  const file = new File([blob], 'image.png', { type: 'image/png' });

  await navigator.share({
    title: "Web Share API",
    text: "Check out Web Share API",
    url: "https://web.dev/web-share/",
    files: [file]
  });
};
</script>

<template>
  <main>
    <h1>Overlay PNG Layers and Share</h1>
    <div>
      <img v-for="i in 8" :key="i" :src="`/img/parallax${i}.png`" alt="parallax" />
    </div>
    <button @click="generateShareImage">Share Stacked Images</button>
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

div {
  max-height: 60dvh;
  overflow-y: scroll;
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(135deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(135deg, transparent 75%, #ccc 75%);
  background-size: 25px 25px;
  background-position: 0 0, 12.5px 0, 12.5px -12.5px, 0px 12.5px;
}

img {
  margin: auto;
  display: block;
  border: 3px solid black;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  background-color: #f8f9fa;
  cursor: pointer;
}
</style>
