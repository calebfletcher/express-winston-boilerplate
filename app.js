const winston = require('winston')
const uuid = require('uuid')
const path = require('path')
const _ = require('lodash')
const compression = require('compression')
const helmet = require('helmet')
const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const server = require('http').createServer(app)

const httpPort = 8888
let logger
let shutdown

app.use(helmet())
app.use(compression())
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, res, next) => {
  req.log = logger.child({ meta: {
    reqId: uuid(),
    path: req.path,
    method: req.method,
    ip: req.ip,
    host: req.hostname,
    userAgent: req.get('User-Agent'),
    reqTime: new Date()
  } })
  req.log.info('access')
  next()
})
app.get('/', (req, res) => {
  res.status(200).send('<h1>Hello World</h1><a href="https://github.com/calebfletcher/express-winston-boilerplate">https://github.com/calebfletcher/express-winston-boilerplate</a>')
})
app.use((req, res) => {
  req.log.info('404')
  res.status(404).send('Not Found')
})

;(async () => {
  try {
    const testFormat = winston.format((info, opts) => {
      info.meta = _.defaults(info.meta, {
        pid: process.pid
      })
      return info
    })

    // Load the logger using the config file variables
    try {
      logger = winston.createLogger({
        levels: winston.config.syslog.levels,
        format: winston.format.combine(testFormat(), winston.format.json()),
        transports: [
          new winston.transports.File({
            filename: path.join(__dirname, 'logs/combined.log'),
            level: 'info'
          })
        ],
        exitOnError: false
      })

      if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston.transports.Console({
          format: winston.format.simple()
        }))
      }

      logger.notice('start', { meta: { environment: process.env.NODE_ENV } })
    } catch (err) {
      console.log('Logger instantiation returned error:', err)
      if (err) throw err
    }

    // Start the web server
    server.listen(httpPort, () => {
      console.log('listening')
      logger.notice('listening', { meta: {
        httpPort: httpPort
      } })
    })

    // Async function to shutdown gracefully
    shutdown = async function shutdown (msg = null) {
      await logger.notice('shutdown', { meta: { msg: msg } })
      await server.close(err => {
        process.exit(err ? 1 : 0)
      })
    }

    // Register handler for app exit
    process.on('SIGINT', shutdown)
  } catch (err) {
    if (err) throw err
  }
})()
