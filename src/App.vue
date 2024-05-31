<script setup lang="ts">
import { ref, watch } from 'vue';
import type { SharePayload } from './share-img-worker';

// Import the file as a worker
import ShareWorker from './share-img-worker?worker';

const image = ref<string | null>(null);
const type = ref<'profile' | 'share' | 'cleanup'>('profile');

watch(type, (newType) => {
  if (newType === 'share') {
    generateShareImage(displayImage, {
      type: 'share',
      profile: {
        name: "testalskdfjlaksjdflasdfaaj",
        team: "testalsdkjflask"
      },
      share: {
        area: random(1000),
        volume: random(1000),
      }
    });
  }

  if (newType === 'cleanup') {
    generateShareImage(displayImage, {
      type: 'cleanup',
      profile: {
        name: "test",
        team: "test"
      },
      cleanup: {
        area: random(1000),
        volume: random(1000),
        impact: random(100000),
        name: "laskdfjlkas asldkfja a jauaajlskdfjalksdjflk",
        participants: random(1000)
      }
    });
  }

  if (newType === 'profile') {
    generateShareImage(displayImage, {
      type: 'profile',
      profile: {
        name: "test",
        team: "test",
        level: random(50)
      },
      monster: Math.floor(Math.random() * 4 + 1),
      share: {
        area: random(100),
        volume: random(10)
      }
    });
  }
}, { immediate: true });


async function generateShareImage(callback: (event: MessageEvent) => void, data: SharePayload) {
  if (!('share' in navigator)) {
    alert('Web Share API not supported')
    return
  }

  const worker = new ShareWorker();

  // listen for the worker to send back the data
  worker.onmessage = callback;

  // send data to the worker
  worker.postMessage(data);
}

async function displayImage(event: MessageEvent) {
  if (typeof event.data !== "string") {
    return;
  }

  const dataUrl = event.data;
  image.value = dataUrl;
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

function random(max: number) {
  return Math.floor(Math.random() * max + 1);
}
</script>

<template>
  <main>
    <h1>Overlay PNG Layers and Share</h1>
    <nav>
      <button @click="type = 'profile'">Profile</button>
      <button @click="type = 'share'">Share</button>
      <button @click="type = 'cleanup'">Cleanup</button>
    </nav>
    <img v-if="image" :src="image" alt="monster" />
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
  width: 80vh;
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
