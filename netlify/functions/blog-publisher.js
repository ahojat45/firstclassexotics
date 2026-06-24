exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { operation, password, topic, keywords, heroImg, pageHtml, card, lslug } = payload;

  if (password !== 'FCE2026') {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!anthropicKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Anthropic API key not configured' }) };
  }
  if (!githubToken) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GitHub token not configured' }) };
  }

  if (operation === 'generate') {
    if (!topic) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing topic' }) };
    }

    const prompt = `You are writing a luxury lifestyle blog post for First Class Exotics, Southern California's #1 exotic car rental company, based in Orange County and serving all of SoCal.\n\nWrite a complete SEO-optimized article about: "${topic}"\n\nAudience — write so the article speaks directly to ALL of these readers:\n- Event planners sourcing exotic cars for high-end celebrations\n- Music video and film producers needing premium vehicles on set\n- Hotel concierges at luxury properties recommending exotic car experiences to VIP guests\n- Party planners organizing celebrity birthdays, quinceañeras, and milestone events\n- Influencers and content creators seeking exotic cars for photoshoots and reels\n- Corporate event organizers impressing clients and rewarding top performers\n- Wedding planners elevating the arrival and departure experience\n\nRequirements:\n- 600-900 words\n- Aspirational luxury tone (Robb Report meets Vogue Living)\n- Orange County is the primary focus; also naturally weave in Los Angeles, San Diego, Riverside County, and Inland Empire (1-2 mentions each)\n- Mention specific SoCal venues where relevant: Pelican Hill Resort, Montage Laguna Beach, Pendry Newport Beach, Pendry San Diego, Beverly Hills Hotel, Nobu Malibu, Coachella Valley, Temecula wine country, Newport Harbor, PCH\n- Establish First Class Exotics as the #1 choice for luxury exotic car experiences in Southern California — mention the brand 3 times naturally\n- H1 headline, 3-4 H2 subheadings, strong opening hook, practical + aspirational content mix\n- Final paragraph must be a call-to-action ending with: "Call or text Ali directly at (949) 294-5958 — First Class Exotics delivers to your hotel, venue, or event location across all of Southern California."\n\nReturn ONLY valid HTML: <h1>...</h1><p>...</p><h2>...</h2><p>...</p> etc. No markdown, no code blocks.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-7',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const message = errorJson?.error?.message || `Anthropic API error ${response.status}`;
        return { statusCode: 502, body: JSON.stringify({ error: message }) };
      }

      const data = await response.json();
      const content = data?.content?.[0]?.text?.trim() || data?.completion?.trim();
      if (!content) {
        return { statusCode: 502, body: JSON.stringify({ error: 'No AI response content' }) };
      }

      return { statusCode: 200, body: JSON.stringify({ content }) };
    } catch (err) {
      return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (operation === 'publish') {
    if (!pageHtml || !card || !lslug) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing publish payload' }) };
    }

    try {
      const repo = 'ahojat45/firstclassexotics';
      const pagePath = `blog/${lslug}.html`;
      const pageUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(pagePath)}`;
      const blogUrl = `https://api.github.com/repos/${repo}/contents/blog.html`;

      const shaResp = await fetch(pageUrl, { headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json' } });
      const pageJson = shaResp.ok ? await shaResp.json() : null;
      const pagePayload = {
        message: `Blog: add ${lslug}`,
        content: Buffer.from(pageHtml, 'utf8').toString('base64'),
        branch: 'main',
      };
      if (pageJson?.sha) pagePayload.sha = pageJson.sha;

      const pageCommit = await fetch(pageUrl, {
        method: 'PUT',
        headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(pagePayload),
      });
      if (!pageCommit.ok) {
        const errorJson = await pageCommit.json().catch(() => null);
        const message = errorJson?.message || `GitHub page commit failed ${pageCommit.status}`;
        return { statusCode: 502, body: JSON.stringify({ error: message }) };
      }

      const blogResp = await fetch(blogUrl, { headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json' } });
      if (!blogResp.ok) {
        return { statusCode: 502, body: JSON.stringify({ error: `Cannot read blog.html from GitHub (${blogResp.status})` }) };
      }
      const blogFile = await blogResp.json();
      const current = Buffer.from(blogFile.content, 'base64').toString('utf8');
      if (!current.includes('<!-- NEW-POSTS-INSERT -->')) {
        return { statusCode: 500, body: JSON.stringify({ error: 'blog.html missing insert marker.' }) };
      }

      const updatedBlog = current.replace('<!-- NEW-POSTS-INSERT -->', `${card}\n        <!-- NEW-POSTS-INSERT -->`);
      const blogCommit = await fetch(blogUrl, {
        method: 'PUT',
        headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Blog: add card for ${lslug}`, content: Buffer.from(updatedBlog, 'utf8').toString('base64'), sha: blogFile.sha, branch: 'main' }),
      });
      if (!blogCommit.ok) {
        const errorJson = await blogCommit.json().catch(() => null);
        const message = errorJson?.message || `GitHub blog commit failed ${blogCommit.status}`;
        return { statusCode: 502, body: JSON.stringify({ error: message }) };
      }

      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (err) {
      return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Invalid operation' }) };
};