const GITHUB_API = 'https://api.github.com';
const GIST_TOKEN = process.env.GIST_TOKEN;

function getHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${GIST_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function findGistByDescription(description) {
  const matches = [];

  for (let page = 1; page <= 10; page += 1) {
    const r = await fetch(`${GITHUB_API}/gists?per_page=100&page=${page}`, { headers: getHeaders() });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`List gists failed: ${text}`);
    }

    const gists = await r.json();
    for (const g of gists) {
      if (g.description === description) matches.push(g);
    }

    if (!Array.isArray(gists) || gists.length < 100) break;
  }

  if (matches.length === 0) return null;
  matches.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  return matches[0];
}

async function getGistById(gistId) {
  const r = await fetch(`${GITHUB_API}/gists/${gistId}`, { headers: getHeaders() });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Get gist failed: ${text}`);
  }
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!GIST_TOKEN) return res.status(500).json({ error: 'Missing GIST_TOKEN' });

  try {
    const user = req.query.user;
    if (!user) return res.status(400).json({ error: 'Missing user' });

    const description = `panamaplan-state:${user}`;
    const gist = await findGistByDescription(description);
    if (!gist) return res.status(200).json({ ok: true, state: null });

    const fullGist = await getGistById(gist.id);
    const file = fullGist.files['panamaplan-state.json'] || Object.values(fullGist.files)[0];
    if (!file || !file.content) return res.status(200).json({ ok: true, state: null });

    let state = null;
    try {
      state = JSON.parse(file.content);
    } catch (e) {
      state = null;
    }

    return res.status(200).json({ ok: true, state });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
};
