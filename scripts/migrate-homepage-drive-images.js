const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');
const OUT_ROOT = path.join(ROOT, 'images', 'fleet');

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(rental|orange|county|first|class|exotics|exotic|car|cars|luxury)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

function getDriveIdFromUrl(url) {
  const match = String(url).match(/[?&]id=([^&]+)/);
  return match ? match[1] : null;
}

async function downloadImage(id, outPath) {
  const url = `https://drive.google.com/thumbnail?id=${id}&sz=w2400`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${id}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error(`Empty image for ${id}`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
}

(async function main() {
  let html = fs.readFileSync(INDEX_PATH, 'utf8');

  const driveImgTagRegex = /<img([^>]*?)src="https:\/\/drive\.google\.com\/thumbnail\?id=([^&"]+)&sz=[^"]+"([^>]*?)>/g;
  const matches = Array.from(html.matchAll(driveImgTagRegex));

  if (!matches.length) {
    console.log('No Drive-hosted image tags found in index.html');
    return;
  }

  let tagCounter = 0;
  const downloadTasks = [];

  html = html.replace(driveImgTagRegex, (full, beforeSrc, srcId, afterSrc) => {
    tagCounter += 1;

    const altMatch = full.match(/alt="([^"]*)"/i);
    const altText = altMatch ? altMatch[1] : `fleet-car-${tagCounter}`;
    const baseSlug = slugify(altText) || `fleet-car-${tagCounter}`;

    const galleryMatch = full.match(/data-gallery="([^"]*)"/i);
    const galleryRaw = galleryMatch ? galleryMatch[1] : srcId;
    const galleryIds = galleryRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((entry) => {
        if (entry.includes('/')) return entry;
        return entry;
      });

    const localGallery = [];
    let localSrc = '';
    let fileIndex = 0;

    galleryIds.forEach((entry) => {
      if (entry.includes('/')) {
        localGallery.push(entry);
        if (!localSrc) localSrc = entry;
        return;
      }
      fileIndex += 1;
      const fileName = `${baseSlug}-${String(fileIndex).padStart(2, '0')}.jpg`;
      const relPath = `images/fleet/${baseSlug}/${fileName}`;
      const absPath = path.join(ROOT, relPath);
      localGallery.push(relPath);
      if (!localSrc) localSrc = relPath;
      if (!fs.existsSync(absPath)) {
        downloadTasks.push({ id: entry, absPath });
      }
    });

    if (!localSrc) {
      fileIndex += 1;
      const fileName = `${baseSlug}-${String(fileIndex).padStart(2, '0')}.jpg`;
      localSrc = `images/fleet/${baseSlug}/${fileName}`;
      const absPath = path.join(ROOT, localSrc);
      localGallery.push(localSrc);
      if (!fs.existsSync(absPath)) {
        downloadTasks.push({ id: srcId, absPath });
      }
    }

    const widthHeight = /\bwidth=/.test(full)
      ? ''
      : ' width="800" height="533"';

    let updated = full
      .replace(/src="https:\/\/drive\.google\.com\/thumbnail\?id=[^&"]+&sz=[^"]+"/i, `src="${localSrc}"`)
      .replace(/data-gallery="[^"]*"/i, `data-gallery="${localGallery.join(',')}"`);

    if (widthHeight) {
      updated = updated.replace('<img', `<img${widthHeight}`);
    }

    return updated;
  });

  // Download unique tasks only.
  const seen = new Set();
  const uniqueTasks = downloadTasks.filter((t) => {
    const key = `${t.id}::${t.absPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Downloading ${uniqueTasks.length} images from Drive...`);
  for (const task of uniqueTasks) {
    // eslint-disable-next-line no-await-in-loop
    await downloadImage(task.id, task.absPath);
  }

  fs.writeFileSync(INDEX_PATH, html, 'utf8');
  console.log('Updated index.html with local fleet image paths.');
})();
