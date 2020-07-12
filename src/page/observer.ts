import config from './config';

import { video } from './element';
import { insetLyricsBtn } from './btn';
import { updateLyric } from './lyrics';

const weakMap = new WeakMap<Element, MutationObserver>();

config.then(({ ALBUM_COVER_SELECTOR, TRACK_INFO_SELECTOR }) => {
  let infoElement: Element | null = null;

  const checkElement = () => {
    // https://github.com/mantou132/Spotify-Lyrics/issues/30
    insetLyricsBtn();
    const prevInfoElement = infoElement;
    infoElement = document.querySelector(TRACK_INFO_SELECTOR);
    if (!infoElement) return;
    if (!prevInfoElement) updateLyric();

    if (!weakMap.has(infoElement)) {
      const cover = document.querySelector(ALBUM_COVER_SELECTOR) as HTMLImageElement;
      // https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
      cover.crossOrigin = 'anonymous';
      const coverCanvas = document.createElement('canvas');
      coverCanvas.width = video.width;
      coverCanvas.height = video.height;
      const ctx = coverCanvas.getContext('2d');
      if (!ctx) return;
      const stream = coverCanvas.captureStream();
      video.srcObject = stream;
      // May load multiple times in a short time
      // Need to remember the last cover image
      let largeImage: HTMLImageElement;
      cover.addEventListener('load', () => {
        // https://github.com/mantou132/Spotify-Lyrics/issues/26#issuecomment-638019333
        const largeUrl = cover.src.replace('00004851', '0000b273');
        largeImage = new Image();
        largeImage.crossOrigin = 'anonymous';
        largeImage.addEventListener('load', function() {
          if (this !== largeImage) return;
          ctx.filter = `blur(0px)`;
          ctx.drawImage(largeImage, 0, 0, video.width, video.height);
        });
        largeImage.addEventListener('error', () => {
          ctx.imageSmoothingEnabled = false;
          const blur = 10;
          ctx.filter = `blur(${blur}px)`;
          ctx.drawImage(cover, -blur * 2, -blur * 2, video.width + 4 * blur, video.height + 4 * blur);
        });
        largeImage.src = largeUrl;
      });
      const infoEleObserver = new MutationObserver(() => {
        updateLyric();
      });
      infoEleObserver.observe(infoElement, { childList: true, characterData: true, subtree: true });
      weakMap.set(infoElement, infoEleObserver);
    }
  };

  checkElement();
  // allow `document.documentElement` rerender
  const htmlEleObserver = new MutationObserver(checkElement);
  htmlEleObserver.observe(document.documentElement, { childList: true, subtree: true });
});
