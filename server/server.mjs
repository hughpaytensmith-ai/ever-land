// Combined server: serves the built SPA (dist/) AND a Yjs y-websocket sync
// endpoint on the SAME port/origin. One port → works behind ngrok (single
// tunnel) and behind Caddy (one reverse_proxy) with TLS giving wss:// for free.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import serveStatic from 'serve-static'
import finalhandler from 'finalhandler'
import { setupWSConnection } from 'y-websocket/bin/utils'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '..', 'dist')
const PORT = Number(process.env.PORT) || 8080
const INDEX = path.join(DIST, 'index.html')

const serve = serveStatic(DIST, { index: ['index.html'], extensions: ['html'] })

const server = http.createServer((req, res) => {
  // health check
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
    return
  }
  serve(req, res, () => {
    // SPA fallback — any unmatched route returns index.html
    fs.readFile(INDEX, (err, buf) => {
      if (err) {
        finalhandler(req, res)(err)
        return
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(buf)
    })
  })
})

// y-websocket: every WS upgrade becomes a Yjs room (room = url path).
const wss = new WebSocketServer({ noServer: true })
wss.on('connection', (conn, req) => setupWSConnection(conn, req))
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[fletchers-bar] serving ${DIST}`)
  console.log(`[fletchers-bar] http + y-websocket on :${PORT}`)
})
