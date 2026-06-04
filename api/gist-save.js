const GITHUB_API = 'https://api.github.com';
const GIST_TOKEN = process.env.GIST_TOKEN;

function getHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${GIST_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
}

async function findGistByDescription(description) {
  const r = await fetch(`${GITHUB_API}/gists`, { headers: getHeaders() });
  if (!r.ok) return null;
  const gists = await r.json();
  return gists.find((g) => g.description === description) || null;
}

async function createGist(description, content) {
  const payload = {
    description,
    public: false,
    files: {
      'panamaplan-state.json': {
        content
      }
    }
  };

  const r = await fetch(`${GITHUB_API}/gists`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Create gist failed: ${text}`);
  }
  return r.json();
}

async function updateGist(gistId, content) {
  const payload = {
    files: {
      'panamaplan-state.json': {
        content
      }
    }
  };

  const r = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Update gist failed: ${text}`);
  }
  return r.json();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!GIST_TOKEN) return res.status(500).json({ error: 'Missing GIST_TOKEN' });

  try {
    const { user, state } = req.body || {};
    if (!user) return res.status(400).json({ error: 'Missing user' });

    const description = `panamaplan-state:${user}`;
    const content = JSON.stringify(state || { checked: {}, weekDone: {} });

    const existing = await findGistByDescription(description);
    const gist = existing
      ? await updateGist(existing.id, content)
      : await createGist(description, content);

    return res.status(200).json({ ok: true, gistId: gist.id });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
};
