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
  const r = await fetch(`${GITHUB_API}/gists`, { headers: getHeaders() });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`List gists failed: ${text}`);
  }
  const gists = await r.json();
  return gists.find((g) => g.description === description) || null;
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

    const file = gist.files['panamaplan-state.json'] || Object.values(gist.files)[0];
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
