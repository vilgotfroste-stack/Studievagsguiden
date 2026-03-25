/**
 * api/myh-proxy.js
 * ================
 * Vercel Serverless Function som proxar anrop till MYH:s officiella API.
 *
 * MYH:s API blockerar server-side-requests utan browser-liknande headers —
 * den här proxyn lägger på rätt headers och vidarebefordrar svaret.
 *
 * Endpoint: GET /api/myh-proxy
 *
 * Query-parametrar:
 *   q            – fritextsökning (MYH: Text)
 *   page         – sidnummer, 0-baserat (MYH: PageIndex)
 *   pageSize     – resultat per sida, max 100 (MYH: PageSize)
 *   municipality – kommunkod, t.ex. "0180" för Stockholm (MYH: MunicipalityCode)
 *   area         – utbildningsområdeskod (MYH: EducationalAreaCode)
 *
 * Exempel:
 *   /api/myh-proxy?q=systemutvecklare&pageSize=50
 *   /api/myh-proxy?municipality=0180&page=2
 */

const MYH_API_BASE = 'https://api.myh.se/Education/V1/GetEducations';

// Browser-liknande headers som MYH kräver
const MYH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://www.myh.se/',
  'Origin': 'https://www.myh.se',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

export default async function handler(req, res) {
  // CORS — tillåt anrop från vår frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q, page, pageSize, municipality, area } = req.query;

    // Bygg MYH-parametrar
    const params = new URLSearchParams();

    if (q)            params.set('Text', q);
    if (municipality) params.set('MunicipalityCode', municipality);
    if (area)         params.set('EducationalAreaCode', area);

    // Sidhantering — MYH är 1-baserat, vi tar emot 0-baserat
    const pageIndex = Math.max(0, parseInt(page || '0', 10));
    params.set('PageIndex', String(pageIndex + 1));
    params.set('PageSize', String(Math.min(100, parseInt(pageSize || '50', 10))));

    const myhUrl = `${MYH_API_BASE}?${params.toString()}`;

    const myhRes = await fetch(myhUrl, {
      headers: MYH_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });

    if (!myhRes.ok) {
      const body = await myhRes.text();
      console.error(`MYH API error ${myhRes.status}:`, body.slice(0, 200));
      return res.status(502).json({
        error: 'MYH API returned an error',
        status: myhRes.status,
      });
    }

    const data = await myhRes.json();

    // Cache i 1 timme hos Vercel Edge
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(data);

  } catch (err) {
    console.error('myh-proxy error:', err.message);
    return res.status(500).json({ error: 'Internal proxy error', message: err.message });
  }
}
