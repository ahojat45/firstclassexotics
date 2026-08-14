const REPO = 'ahojat45/firstclassexotics';
const crypto = require('crypto');
const BRANCH = 'main';
const BLOG_INSERT_MARKER = '<!-- NEW-POSTS-INSERT -->';
const MAX_SLUG_LENGTH = 60;
const MAX_IMAGES = 5;
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(payload),
});

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/&amp;/g, ' and ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/g, '');
}

function normalizeBlogHref(slug) {
  let normalizedSlug = String(slug || '').trim();
  while (/^\/?blog\//i.test(normalizedSlug)) {
    normalizedSlug = normalizedSlug.replace(/^\/?blog\//i, '');
  }
  normalizedSlug = normalizedSlug.replace(/^\/+/, '');
  return `/blog/${normalizedSlug}`;
}

function getBlogHrefVariants(slug) {
  const absoluteHref = normalizeBlogHref(slug);
  const relativeHref = absoluteHref.replace(/^\/blog\//, 'blog/');
  return [absoluteHref, relativeHref, `${absoluteHref}.html`, `${relativeHref}.html`];
}

function removeExistingCardBySlug(blogHtml, slug) {
  const hrefVariants = getBlogHrefVariants(slug);
  let hrefIndex = -1;
  for (const hrefVariant of hrefVariants) {
    hrefIndex = blogHtml.indexOf(`href="${hrefVariant}"`);
    if (hrefIndex !== -1) break;
  }
  if (hrefIndex === -1) {
    return { html: blogHtml, removed: false };
  }

  const cardStart = blogHtml.lastIndexOf('<a ', hrefIndex);
  const cardEndTagIndex = blogHtml.indexOf('</a>', hrefIndex);
  if (cardStart === -1 || cardEndTagIndex === -1) {
    throw new Error(`Existing blog card for slug ${slug} could not be parsed`);
  }

  const cardEnd = cardEndTagIndex + 4;
  const before = blogHtml.slice(0, cardStart).replace(/[ \t]*$/g, '');
  const after = blogHtml.slice(cardEnd).replace(/^\s*\n/, '\n');
  return { html: `${before}\n\n${after}`, removed: true };
}

function githubPathUrl(path) {
  const encoded = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `https://api.github.com/repos/${REPO}/contents/${encoded}`;
}

// Constant-time string compare, so a wrong password cannot be recovered by timing.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so length is not leaked by timing.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function githubHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };
}

async function githubGet(path, token) {
  const response = await fetch(githubPathUrl(path), {
    headers: githubHeaders(token),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const errorJson = await readJsonResponse(response);
    throw new Error(errorJson?.message || `GitHub read failed ${response.status}`);
  }

  return readJsonResponse(response);
}

async function githubPut(path, token, contentUtf8, message, sha) {
  const payload = {
    message,
    content: Buffer.from(contentUtf8, 'utf8').toString('base64'),
    branch: BRANCH,
  };
  if (sha) payload.sha = sha;

  const response = await fetch(githubPathUrl(path), {
    method: 'PUT',
    headers: {
      ...githubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorJson = await readJsonResponse(response);
    throw new Error(errorJson?.message || `GitHub write failed ${response.status}`);
  }

  return readJsonResponse(response);
}

async function githubPutBase64(path, token, contentBase64, message, sha) {
  const payload = {
    message,
    content: contentBase64,
    branch: BRANCH,
  };
  if (sha) payload.sha = sha;

  const response = await fetch(githubPathUrl(path), {
    method: 'PUT',
    headers: {
      ...githubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorJson = await readJsonResponse(response);
    throw new Error(errorJson?.message || `GitHub write failed ${response.status}`);
  }

  return readJsonResponse(response);
}

async function githubDelete(path, token, sha, message) {
  const response = await fetch(githubPathUrl(path), {
    method: 'DELETE',
    headers: {
      ...githubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sha,
      branch: BRANCH,
    }),
  });

  if (!response.ok) {
    const errorJson = await readJsonResponse(response);
    throw new Error(errorJson?.message || `GitHub delete failed ${response.status}`);
  }

  return readJsonResponse(response);
}

async function generateArticle({ topic, category, keywords, notes, anthropicKey }) {
  const prompt = `You are writing a luxury editorial blog article for First Class Exotics in Orange County.

Topic: "${topic}"
Category: ${category || 'general'}
Target keywords: ${keywords || 'exotic car rental orange county'}
Optional notes/facts from Ali: ${notes || 'none'}

Requirements:
- Return only valid HTML body content (no <html>, <head>, or markdown fences).
- Include one <h1> headline, 3-5 useful <h2> sections, optional <h3>, and practical paragraphs.
- 650-900 words.
- Focus on real Southern California use cases and practical details (routes, timing, logistics, planning).
- Mention only 2-3 relevant venues naturally; do not list every venue.
- Avoid cliches like "epitome of luxury", "ultimate luxury", "unparalleled" and similar filler.
- Keep tone high-end but specific and grounded.
- End with a concise CTA mentioning call/text (949) 294-5958.
- Do not include script tags, style tags, or iframe tags.
`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorJson = await readJsonResponse(response);
    const message =
      errorJson?.error?.message ||
      errorJson?.error ||
      errorJson?.message ||
      `Anthropic API error ${response.status}`;
    throw new Error(message);
  }

  const data = await readJsonResponse(response);
  const content = data?.content?.[0]?.text?.trim() || data?.completion?.trim();
  if (!content) {
    throw new Error('No AI response content');
  }

  return content;
}

async function publishArticle({ pageHtml, card, slugInput, images, githubToken, overwriteExisting }) {
  const slug = slugify(slugInput);
  if (!slug) {
    return json(400, { error: 'Invalid slug' });
  }

  const extensionlessPostUrl = `https://www.firstclassexotics.com/blog/${slug}`;
  const htmlPostUrl = `${extensionlessPostUrl}.html`;
  const normalizedPageHtml = String(pageHtml)
    .replaceAll(htmlPostUrl, extensionlessPostUrl)
    .replace(/(<link rel="canonical" href="https:\/\/www\.firstclassexotics\.com\/blog\/[^"]+)\.html(")/g, '$1$2')
    .replace(/(<meta property="og:url" content="https:\/\/www\.firstclassexotics\.com\/blog\/[^"]+)\.html(")/g, '$1$2');
  const normalizedCardHref = normalizeBlogHref(slug);
  const normalizedCard = String(card)
    .replaceAll(`href="blog/${slug}.html"`, `href="${normalizedCardHref}"`)
    .replaceAll(`href="blog/${slug}"`, `href="${normalizedCardHref}"`)
    .replaceAll(`href="/blog/${slug}.html"`, `href="${normalizedCardHref}"`)
    .replaceAll(`href="/blog/${slug}"`, `href="${normalizedCardHref}"`);

  const pagePath = `blog/${slug}.html`;
  const pageExists = await githubGet(pagePath, githubToken);
  if (pageExists && !overwriteExisting) {
    return json(409, { error: 'Post with this slug already exists' });
  }

  if (Array.isArray(images) && images.length > MAX_IMAGES) {
    return json(400, { error: `A maximum of ${MAX_IMAGES} uploaded images is allowed` });
  }

  if (Array.isArray(images) && images.length > 0) {
    for (let i = 0; i < images.length; i += 1) {
      const image = images[i] || {};
      const rawBase64 = String(image.dataBase64 || '').trim();
      if (!rawBase64) {
        return json(400, { error: `Missing base64 data for uploaded image ${i + 1}` });
      }

      const imagePath = `images/blog/${slug}/${i + 1}.jpg`;
      await githubPutBase64(imagePath, githubToken, rawBase64, `Blog: add image ${i + 1} for ${slug}`);
    }
  }

  await githubPut(
    pagePath,
    githubToken,
    normalizedPageHtml,
    `${pageExists ? 'Blog: update' : 'Blog: add'} ${slug}`,
    pageExists?.sha,
  );

  const blogFile = await githubGet('blog.html', githubToken);
  if (!blogFile?.content || !blogFile?.sha) {
    throw new Error('Cannot read blog.html');
  }

  const currentBlog = Buffer.from(blogFile.content, 'base64').toString('utf8');
  if (!currentBlog.includes(BLOG_INSERT_MARKER)) {
    throw new Error('blog.html missing insert marker');
  }

  const blogHrefVariants = getBlogHrefVariants(slug);
  const hasExistingCard = blogHrefVariants.some((hrefVariant) => currentBlog.includes(`href="${hrefVariant}"`));
  if (hasExistingCard && !overwriteExisting) {
    return json(409, { error: 'Post with this slug already exists' });
  }

  let nextBlog = currentBlog;
  if (overwriteExisting && hasExistingCard) {
    nextBlog = removeExistingCardBySlug(nextBlog, slug).html;
  }

  const updatedBlog = nextBlog.replace(BLOG_INSERT_MARKER, `${normalizedCard}\n\n  ${BLOG_INSERT_MARKER}`);
  await githubPut('blog.html', githubToken, updatedBlog, `Blog: add card for ${slug}`, blogFile.sha);

  const sitemapFile = await githubGet('sitemap.xml', githubToken);
  if (!sitemapFile?.content || !sitemapFile?.sha) {
    throw new Error('Cannot read sitemap.xml');
  }

  const sitemapCurrent = Buffer.from(sitemapFile.content, 'base64').toString('utf8');
  const newUrl = `https://www.firstclassexotics.com/blog/${slug}`;
  const lastmod = new Date().toISOString().slice(0, 10);

  if (!sitemapCurrent.includes(`<loc>${newUrl}</loc>`)) {
    const sitemapEntry = `  <url><loc>${newUrl}</loc><lastmod>${lastmod}</lastmod><priority>0.7</priority></url>\n`;
    const updatedSitemap = sitemapCurrent.replace('</urlset>', `${sitemapEntry}</urlset>`);
    await githubPut('sitemap.xml', githubToken, updatedSitemap, `Blog: append sitemap URL for ${slug}`, sitemapFile.sha);
  }

  return json(200, { success: true, slug, pagePath, sitemapUrl: newUrl, overwritten: Boolean(pageExists) });
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'Method Not Allowed' });
    }

    if (event.body && Buffer.byteLength(event.body, 'utf8') > MAX_BODY_BYTES) {
      return json(413, { error: 'Request body too large' });
    }

    let payload;
    try {
      payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    } catch {
      return json(400, { error: 'Invalid request body' });
    }

    const {
      operation,
      password,
      topic,
      category,
      keywords,
      notes,
      pageHtml,
      card,
      lslug,
      images,
      overwriteExisting,
    } = payload;

    // Gate password lives ONLY in the Netlify env var BLOG_PUBLISHER_PASSWORD.
    // It is never sent to the browser. Fail closed if it is not configured.
    const gatePassword = process.env.BLOG_PUBLISHER_PASSWORD;

    if (!gatePassword) {
      return json(500, { error: 'BLOG_PUBLISHER_PASSWORD not configured' });
    }

    if (!safeEqual(String(password || ''), gatePassword)) {
      return json(401, { error: 'Unauthorized' });
    }

    // Lightweight credential check used by the login screen. Must stay AFTER the
    // password check and BEFORE any operation that needs GitHub/Anthropic keys.
    if (operation === 'auth') {
      return json(200, { ok: true });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return json(500, { error: 'GitHub token not configured' });
    }

    if (operation === 'generate') {
      if (!anthropicKey) {
        return json(500, { error: 'Anthropic API key not configured' });
      }
      if (!topic) {
        return json(400, { error: 'Missing topic' });
      }

      try {
        const content = await generateArticle({ topic, category, keywords, notes, anthropicKey });
        return json(200, { content });
      } catch (err) {
        return json(502, { error: err.message });
      }
    }

    if (operation === 'publish') {
      if (!pageHtml || !card || !lslug) {
        return json(400, { error: 'Missing publish payload' });
      }

      try {
        return await publishArticle({
          pageHtml,
          card,
          slugInput: lslug,
          images: Array.isArray(images) ? images : [],
          githubToken,
          overwriteExisting: Boolean(overwriteExisting),
        });
      } catch (err) {
        return json(502, { error: err.message });
      }
    }

    if (operation === 'delete-post') {
      const slug = slugify(lslug);
      if (!slug) return json(400, { error: 'Missing slug' });

      try {
        const pagePath = `blog/${slug}.html`;
        const pageFile = await githubGet(pagePath, githubToken);
        if (pageFile?.sha) {
          await githubDelete(pagePath, githubToken, pageFile.sha, `Blog: remove ${slug}`);
        }
        return json(200, { success: true });
      } catch (err) {
        return json(502, { error: err.message });
      }
    }

    return json(400, { error: 'Invalid operation' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
