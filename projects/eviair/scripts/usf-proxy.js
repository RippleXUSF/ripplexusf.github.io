// scripts/usf-proxy.js
// Run this on ripple.cs.usfca.edu: node usf-proxy.js
// It proxies HTTP POST requests to the local rippled node at 127.0.0.1:5005

const http = require('http')

const PORT = 3001

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end('Method not allowed')
    return
  }

  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', () => {
    const options = {
      hostname: '127.0.0.1',
      port:     5005,
      path:     '/',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }

    const proxy = http.request(options, (rippleRes) => {
      let data = ''
      rippleRes.on('data', chunk => data += chunk)
      rippleRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(data)
      })
    })

    proxy.on('error', (e) => {
      console.error('Rippled error:', e.message)
      res.writeHead(502)
      res.end(JSON.stringify({ error: 'Could not reach rippled node' }))
    })

    proxy.write(body)
    proxy.end()
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`USF rippled proxy running on port ${PORT}`)
  console.log(`Forwarding to local rippled at 127.0.0.1:5005`)
})
