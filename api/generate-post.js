import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { topic, category } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const slug = `article${Date.now()}`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are writing a luxury exotic car rental blog post for First Class Exotics, a premium exotic car rental company in the Phoenix/Scottsdale, Arizona area. Their clientele are high-net-worth individuals.

Write a complete, SEO-optimized blog article about: "${topic}"

Requirements:
- 600-900 words
- Professional, aspirational luxury tone (think Robb Report, DuPont Registry)
- Naturally weave in "exotic car rental Scottsdale", "luxury car rental Phoenix", "First Class Exotics" 2-3 times each
- Include a compelling headline (H1)
- 3-4 subheadings (H2)
- Strong opening paragraph that hooks the reader
- Practical value mixed with aspirational lifestyle content
- End with a subtle call to action mentioning First Class Exotics

Return ONLY valid HTML content (no markdown, no code blocks) in this exact structure:
<h1>[Headline]</h1>
<p>[intro paragraph]</p>
<h2>[Subheading]</h2>
<p>[content]</p>
[... more h2/p sections ...]
<p>[closing CTA paragraph]</p>`
        }
      ]
    });

    const articleBody = message.content[0].text.trim();
    const headline = articleBody.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || topic;
    const excerpt = articleBody.match(/<p[^>]*>(.*?)<\/p>/i)?.[1]?.replace(/<[^>]+>/g, '').slice(0, 160) || '';
    const catLabel = category || 'Lifestyle';

    const cardHtml = `
        <article class="blog-card" onclick="openArticle('${slug}')">
          <div class="blog-card-img" style="background:linear-gradient(135deg,#0a0a0a 0%,#1a0a0a 100%);display:flex;align-items:center;justify-content:center;">
            <span style="font-size:3rem;opacity:.3">&#9632;</span>
          </div>
          <div class="blog-card-content">
            <span class="blog-tag">${catLabel}</span>
            <h3>${headline}</h3>
            <p>${excerpt}…</p>
            <div class="blog-meta">
              <span>${dateStr}</span>
              <span>First Class Exotics</span>
            </div>
          </div>
        </article>`;

    const overlayHtml = `
  <div class="article-overlay" id="${slug}">
    <div class="article-content">
      <button class="article-close" onclick="closeArticle('${slug}')">&#10005;</button>
      <div class="article-meta">
        <span class="blog-tag">${catLabel}</span>
        <span style="color:var(--gray-2);font-size:.8rem;margin-left:1rem">${dateStr}</span>
      </div>
      ${articleBody}
    </div>
  </div>`;

    res.status(200).json({ slug, headline, cardHtml, overlayHtml, articleBody });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Generation failed', detail: err.message });
  }
}
