export default async function handler(req, res) {
  // eslint-disable-next-line no-undef
  const BufferRef = typeof Buffer !== 'undefined' ? Buffer : null
  const base = 'https://api-v6.louveapp.com.br'
  // Route params are usually under req.query.path, but keep a fallback based on req.url.
  let pathParts = Array.isArray(req.query?.path) ? req.query.path : [req.query?.path].filter(Boolean)
  if (!pathParts || pathParts.length === 0) {
    const rawPath = String(req.url || '').split('?')[0] || ''
    const prefix = '/api/louve/'
    if (rawPath.startsWith(prefix)) {
      const rest = rawPath.slice(prefix.length)
      pathParts = rest.split('/').filter(Boolean)
    }
  }
  if (!pathParts || pathParts.length === 0) {
    res.statusCode = 400
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: true, message: 'Missing proxy path', example: '/api/louve/ministry/<id>/schedules' }))
    return
  }
  const qsIndex = req.url.indexOf('?')
  const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : ''
  const targetUrl = `${base}/${pathParts.join('/')}${qs}`

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
    else if (BufferRef && BufferRef.isBuffer && BufferRef.isBuffer(req.body)) body = req.body
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


