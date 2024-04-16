import {
  Agent,
  MediatorPickupStrategy,
  AutoAcceptCredential,
  WsOutboundTransport,
  HttpOutboundTransport,
  ConsoleLogger,
  LogLevel,
  CredentialEventTypes,
  CredentialStateChangedEvent,
  CredentialState,
  OutOfBandInvitation,
} from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import fs from 'fs'
import path from 'path'
import process from 'process'

const ledgersPath = path.join(__dirname, 'ledgers.json')
const ledgers = JSON.parse(fs.readFileSync(ledgersPath, 'utf8'))
const defaultMediatorUrl = 'add-http-endpoint-here'

enum Style {
  BrightYellow = '\x1b[33m%s\x1b[0m',
  BrightCyan = '\x1b[36m%s\x1b[0m',
  BrightRed = '\x1b[31m%s\x1b[0m'
}

const log = (message: string, style = Style.BrightYellow) => {
  console.log(style, `LOG: ${message}`)
}

const cleanupOldInvitation = async (agent: Agent, invite: OutOfBandInvitation) => {
  const oobRecord = await agent?.oob.findByReceivedInvitationId(invite.id)
  log(`found oob = ${JSON.stringify(oobRecord)}`)

  if (oobRecord) {
    log(`removing oob`)
    await agent?.oob.deleteById(oobRecord.id)
    log(`removed oob`)
  }
}

const connectToAgent = async (agent: Agent, url: string, timeoutMs = 3000): Promise<string> => {
  const invite = await agent?.oob.parseInvitation(url)
  log(`parsed inviation = ${JSON.stringify(invite)}`)

  await cleanupOldInvitation(agent, invite)

  log(`recieving inviation = ${JSON.stringify(invite)}`)
  const record = await agent?.oob.receiveInvitation(invite)
  log(`received inviation = ${JSON.stringify(record)}`)

  log(`waiting on connection, id = ${record.connectionRecord?.id!}`)
  const connectionStartTime = Date.now()
  await agent.connections.returnWhenIsConnected(record.connectionRecord?.id!, { timeoutMs })
  const connectionDelay = Date.now() - connectionStartTime
  log(`connected = ${record.connectionRecord?.id!}, wait = ${connectionDelay}ms`)

  return record.connectionRecord?.id!
}

const parseArgs = () => {
  let mediatorUrl: string
  let invitationUrl: string
  const args = process.argv
  const mediatorIdx = args.indexOf('-m')
  const inviationIdx = args.indexOf('-i')

  if (isNaN(mediatorIdx) || mediatorIdx === -1) {
    log('No mediator url provided, using default.', Style.BrightCyan)
    log('usage: -m https://example.com?c_i=abc123', Style.BrightCyan)
  }

  if (isNaN(inviationIdx) || inviationIdx === -1) {
    log('You must supply an invitation url', Style.BrightRed)
    log('usage: -i https://example.com?c_i=abc123', Style.BrightRed)

    process.exit(-1)
  }

  if (mediatorIdx) {
    mediatorUrl = args[mediatorIdx+1] 
  } else {
    mediatorUrl = defaultMediatorUrl
  }

  invitationUrl = args[inviationIdx+1]
  
  return { mediatorUrl, invitationUrl }
}

const main = async () => {
  const config = parseArgs()

  const agent = new Agent({
    config: {
      label: "Jason Test Rig",
      logger: new ConsoleLogger(LogLevel.trace),
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

    log('initalizing agent')

    await agent.initialize();

    log('initalized agent')

    agent.events.on(
      CredentialEventTypes.CredentialStateChanged,
      async ({ payload }: CredentialStateChangedEvent) => {
        if (payload.credentialRecord.state === CredentialState.OfferReceived) {
          log(`offer = ${JSON.stringify(payload.credentialRecord)}`)
          // await this.newCredentialPrompt(payload.credentialRecord, aliceInquirer)
        }
      }
    )

    //
    // Connect to the agent that will offer a credential,
    // timeout 10 seconds on the connection.
    //

    await connectToAgent(agent, config.invitationUrl, 10000)
    
    //
    // Faux Event Loop
    //
    // Once running, pring the number of offers we have aevery 5
    // seconds. After 10 loops, re-initiate the mediator.
    //

    const timeoutScheduled = Date.now();
    const count = 0
    setInterval(async () => {
      const delay = Date.now() - timeoutScheduled

      const c = await agent.credentials.getAll()
      log(`${delay}ms have passed since I was scheduled, offer count = ${c.length}`)
      c.forEach((cc, idx) => { log(`offer #${idx + 1} id = ${cc.id}`)})

      if (count >= 10) {
        log('re-initiating message pickup')
        await agent.mediationRecipient.initiateMessagePickup()
      }
    }, 5000);
  } catch (error) {
    console.log(error)
  }
}


main()
