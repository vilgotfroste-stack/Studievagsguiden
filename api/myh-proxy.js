/**
 * api/myh-proxy.js
 * ================
 * Vercel Serverless Function som proxar anrop till Skolverkets Susa-navet API (v4).
 *
 * Endpoint: GET /api/myh-proxy
 *
 * Query-parametrar:
 *   q            – fritextsökning (Skolverket: searchTerm)
 *   page         – sidnummer, 0-baserat
 *   pageSize     – resultat per sida, max 100
 *   municipality – kommunkod/namn (Skolverket: municipality)
 *   distance     – "true" / "false" för distans/campus
 *   typeOfSchool – t.ex. "yhprogram" (default: yhprogram)
 *
 * Exempel:
 *   /api/myh-proxy?q=systemutvecklare&pageSize=20
 *   /api/myh-proxy?typeOfSchool=yhprogram&municipality=Stockholm
 */

const SKOLVERKET_BASE = 'https://api.skolverket.se/planned-educations/v4/adult-education-events';

const SKOLVERKET_HEADERS = {
  'Accept': 'application/vnd.skolverket.plannededucations.api.v4.hal+json',
  'User-Agent': 'Mozilla/5.0 (compatible; StudievagsguidentBot/1.0)',
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
    const { q, page, pageSize, municipality, distance, typeOfSchool } = req.query;

    const params = new URLSearchParams();

    // Utbildningsform — default: yhprogram
    params.set('typeOfSchool', typeOfSchool || 'yhprogram');

    if (q)            params.set('searchTerm', q);
    if (municipality) params.set('municipality', municipality);
    if (distance)     params.set('distance', distance);

    params.set('page',  String(Math.max(0, parseInt(page || '0', 10))));
    params.set('size',  String(Math.min(100, parseInt(pageSize || '20', 10))));
    params.set('sort',  'titleSv,asc');

    const apiUrl = `${SKOLVERKET_BASE}?${params.toString()}`;

    const apiRes = await fetch(apiUrl, {
      headers: SKOLVERKET_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });

    if (!apiRes.ok) {
      const body = await apiRes.text();
      console.error(`Skolverket API error ${apiRes.status}:`, body.slice(0, 200));
      return res.status(502).json({
        error: 'Skolverket API returned an error',
        status: apiRes.status,
      });
    }

    const data = await apiRes.json();

    // Cache i 1 timme hos Vercel Edge
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(data);

  } catch (err) {
    console.error('myh-proxy error:', err.message);
    return res.status(500).json({ error: 'Internal proxy error', message: err.message });
  }
}
