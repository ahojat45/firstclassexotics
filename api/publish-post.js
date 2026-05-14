export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { cardHtml, overlayHtml } = req.body || {};
  if (!cardHtml || !overlayHtml) {
    return res.status(400).json({ error: 'Missing cardHtml or overlayHtml' });
  }

  const repo = process.env.GITHUB_REPO; // "ahojat45/firstclassexotics"
  const ghToken = process.env.GITHUB_TOKEN;
  const apiBase = `https://api.github.com/repos/${repo}/contents/blog.html`;

  try {
    // Fetch current blog.html from GitHub
    const getRes = await fetch(apiBase, {
      headers: {
        Authorization: `token ${ghToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    if (!getRes.ok) throw new Error(`GitHub GET failed: ${getRes.status}`);
    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');

    // Insert card before the closing marker
    if (!currentContent.includes('<!-- NEW-POSTS-INSERT -->')) {
      return res.status(500).json({ error: 'blog.html missing <!-- NEW-POSTS-INSERT --> marker' });
    }
    if (!currentContent.includes('<!-- NEW-ARTICLES-INSERT -->')) {
      return res.status(500).json({ error: 'blog.html missing <!-- NEW-ARTICLES-INSERT --> marker' });
    }

    let updated = currentContent.replace(
      '<!-- NEW-POSTS-INSERT -->',
      `${cardHtml}\n        <!-- NEW-POSTS-INSERT -->`
    );
    updated = updated.replace(
      '<!-- NEW-ARTICLES-INSERT -->',
      `${overlayHtml}\n  <!-- NEW-ARTICLES-INSERT -->`
    );

    const encoded = Buffer.from(updated).toString('base64');
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: {
        Authorization: `token ${ghToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Blog: publish new post via admin',
        content: encoded,
        sha: fileData.sha,
        branch: 'main'
      })
    });

    if (!putRes.ok) {
      const errBody = await putRes.text();
      throw new Error(`GitHub PUT failed: ${putRes.status} ${errBody}`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Publish failed', detail: err.message });
  }
}
