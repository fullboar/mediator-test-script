import {
  Agent,
  MediatorPickupStrategy,
  AutoAcceptCredential,
  WsOutboundTransport,
  HttpOutboundTransport,
  ConsoleLogger,
  LogLevel,
} from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import fs from 'fs'
import { setMaxIdleHTTPParsers } from 'http'
import path from 'path'
import process from 'process'

const ledgersPath = path.join(__dirname, 'ledgers.json')
const ledgers = JSON.parse(fs.readFileSync(ledgersPath, 'utf8'))

enum Style {
  BrightYellow = '\x1b[33m%s\x1b[0m',
  BrightCyan = '\x1b[36m%s\x1b[0m',
  BrightRed = '\x1b[31m%s\x1b[0m'
}

const log = (message: string, style = Style.BrightYellow) => {
  console.log(style, `LOG: ${message}`)
}

const parseArgs = () => {
  let mediatorUrl: string
  const args = process.argv
  const mediatorIdx = args.indexOf('-m')

  if (isNaN(mediatorIdx) || mediatorIdx === -1) {
    log('No mediator url provided, using default.', Style.BrightCyan)
    log('usage: -m https://example.com?c_i=abc123', Style.BrightCyan)

    process.exit(-1)
  }

  mediatorUrl = args[mediatorIdx+1] 

  return { mediatorUrl }
}

const createNewAgent = (config: any) => {
  const agent = new Agent({
    config: {
      label: "Jason Test Rig",
      logger: new ConsoleLogger(LogLevel.debug),
      mediatorConnectionsInvite: config.mediatorUrl,
      mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
      autoAcceptConnections: true,
      autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
      indyLedgers: ledgers,
      connectToIndyLedgersOnStartup: false,
      autoUpdateStorageOnStartup: true,
      walletConfig: {
        id: "walletId",
        key: "walletKey",
      },
    },
    dependencies: agentDependencies,
  });

  try {
    const wsTransport = new WsOutboundTransport()
    const httpTransport = new HttpOutboundTransport()

    agent.registerOutboundTransport(wsTransport)
    agent.registerOutboundTransport(httpTransport)

    return agent
  } catch (error) {
    console.log(error)
  }
}

const main = async () => {
  const config = parseArgs()
  const agent = createNewAgent(config)
  const timeoutScheduled = Date.now();

  log(`start`)

  try {
    if (!agent?.isInitialized) {
      log(`will initialize agent`)
      await agent?.initialize();
      log(`did initialize agent`)
    }

    const connections = agent?.connections.getAll()
    log (JSON.stringify(connections))

    if (agent?.isInitialized) {
      log(`will shutdown agent`)
      await agent?.shutdown()
      log(`did shutdown agent`)
    }
  } catch (error: unknown) {
    console.log(`error = ${(error as Error).message}`);
    process.exit(-1)
  }

  log(`end, run time = ${Date.now() - timeoutScheduled}ms`)

  process.exit(0)
}

main()
