export default async function handler(req, res) {
  const base = 'https://api-v6.louveapp.com.br'

  // Accept a target path via query param:
  // POST /api/louve?path=ministry/<id>/schedules
  const rawPath = typeof req.query?.path === 'string' ? req.query.path : ''
  const trimmed = rawPath.replace(/^\//, '').trim()

  if (!trimmed) {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(
      JSON.stringify({
        ok: true,
        proxy: 'louve',
        usage: 'POST /api/louve?path=ministry/<id>/schedules',
      })
    )
    return
  }

  const targetUrl = `${base}/${trimmed}`

  // Forward only relevant headers
  const headers = {}
  const pass = [
    'authorization',
    'content-type',
    'accept',
    'device',
    'x-platform',
    'locale',
    'build-number',
    'country-code',
  ]
  pass.forEach(k => {
    const v = req.headers[k]
    if (typeof v === 'string' && v.length > 0) headers[k] = v
  })
  if (!headers.accept) headers.accept = 'application/json'

  let body
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (typeof req.body === 'string') body = req.body
    else if (req.body && typeof req.body === 'object') body = JSON.stringify(req.body)
  }

  let upstream
  try {
    upstream = await fetch(targetUrl, { method: req.method, headers, body })
  } catch (e) {
    res.statusCode = 502
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: true, message: 'Upstream request failed', details: String(e?.message || e) }))
    return
  }

  res.statusCode = upstream.status
  const ct = upstream.headers.get('content-type')
  if (ct) res.setHeader('content-type', ct)
  const text = await upstream.text()
  res.end(text)
}


