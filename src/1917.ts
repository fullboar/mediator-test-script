import {
  AnonCredsModule,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
  V1CredentialProtocol,
  V1ProofProtocol,
  AnonCredsCredentialFormatService,
  AnonCredsProofFormatService,
} from '@aries-framework/anoncreds'
import { AnonCredsRsModule } from '@aries-framework/anoncreds-rs'
import { AskarModule } from '@aries-framework/askar'
import {
  Agent,
  MediatorPickupStrategy,
  AutoAcceptCredential,
  WsOutboundTransport,
  HttpOutboundTransport,
  ConsoleLogger,
  LogLevel,
  ConnectionsModule,
  CredentialsModule,
  ProofsModule,
  MediationRecipientModule,
  V2CredentialProtocol,
  V2ProofProtocol,
  AutoAcceptProof,
} from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import { IndyVdrAnonCredsRegistry, IndyVdrModule, IndyVdrPoolConfig } from '@aries-framework/indy-vdr'
import { anoncreds } from '@hyperledger/anoncreds-nodejs'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { indyVdr } from '@hyperledger/indy-vdr-nodejs'

import fs from 'fs'
import path from 'path'
import process from 'process'

const ledgersPath = path.join(__dirname, 'ledgers.json')
const ledgers = JSON.parse(fs.readFileSync(ledgersPath, 'utf8'))
// const defaultMediatorUrl = 'https://aries-mediator-agent-test.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICIwZTZmNWVkOC05MWVmLTQyNGYtOWMzYi0zN2VkMDliNTdjNzUiLCAicmVjaXBpZW50S2V5cyI6IFsiM3FCbmlHd1dMY3NHaXpKQTV0NFRFRFJyTDFWNFV5eTVXMzlwOWd0UjhycFEiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2FyaWVzLW1lZGlhdG9yLWFnZW50LXRlc3QuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSIsICJsYWJlbCI6ICJCQyBXYWxsZXQgU2VydmljZSAoVGVzdCkifQ=='
const defaultMediatorUrl = 'https://aries-mediator-agent.vonx.io?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICJiYWEwMjBmMy1iMmM3LTQ0MzktYWQ4NC1iZmIxZTc4YmM2NjkiLCAibGFiZWwiOiAiQkMgV2FsbGV0IFNlcnZpY2UiLCAicmVjaXBpZW50S2V5cyI6IFsiRkVXV1MzUnQ4UERMYlczYnkxaFpqOXlxWm53blk2ajdBMmdqa1FZRXE3VG8iXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2FyaWVzLW1lZGlhdG9yLWFnZW50LnZvbnguaW8ifQ=='

const walletId = "abc123"
const walletKey = "abc123"

enum ExitCodes {
  Success = 0,
  ParametersNotSet = 1,
  TestFail = 3,
} 

enum Style {
  BrightYellow = '\x1b[33m%s\x1b[0m',
  BrightCyan = '\x1b[36m%s\x1b[0m',
  BrightRed = '\x1b[31m%s\x1b[0m'
}

const log = (message: string, style = Style.BrightYellow) => {
  console.log(style, `LOG: ${message}`)
}

type GetAgentModulesOptions = {
  indyNetworks: IndyVdrPoolConfig[]
  mediatorInvitationUrl?: string
}

const agentModules = ({ indyNetworks, mediatorInvitationUrl }: GetAgentModulesOptions) => {
  const indyCredentialFormat = new LegacyIndyCredentialFormatService()
  const indyProofFormat = new LegacyIndyProofFormatService()

  return {
    askar: new AskarModule({
      ariesAskar,
    }),
    anoncredsRs: new AnonCredsRsModule({
      anoncreds,
    }),
    anoncreds: new AnonCredsModule({
      registries: [new IndyVdrAnonCredsRegistry()],
    }),
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: indyNetworks as [IndyVdrPoolConfig],
    }),
    connections: new ConnectionsModule({
      autoAcceptConnections: true,
    }),
    credentials: new CredentialsModule({
      autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new V1CredentialProtocol({ indyCredentialFormat }),
        new V2CredentialProtocol({
          credentialFormats: [indyCredentialFormat, new AnonCredsCredentialFormatService()],
        }),
      ],
    }),
    proofs: new ProofsModule({
      autoAcceptProofs: AutoAcceptProof.ContentApproved,
      proofProtocols: [
        new V1ProofProtocol({ indyProofFormat }),
        new V2ProofProtocol({
          proofFormats: [indyProofFormat, new AnonCredsProofFormatService()],
        }),
      ],
    }),
    mediationRecipient: new MediationRecipientModule({
      mediatorInvitationUrl: mediatorInvitationUrl,
      mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
    }),
  }
}

const makeAgent = (walletId = 'abc123', walletKey = 'abc123') => {
  const modules = agentModules({indyNetworks: ledgers, mediatorInvitationUrl: defaultMediatorUrl})

  const agent = new Agent({
    config: {
      label: 'Test Agent',
      walletConfig: {
        id: walletId,
        key: walletKey,
      },
      logger: new ConsoleLogger(LogLevel.trace),
      autoUpdateStorageOnStartup: true,
    },
    dependencies: agentDependencies,
    modules,
  })
  const wsTransport = new WsOutboundTransport()
  const httpTransport = new HttpOutboundTransport()

  agent.registerOutboundTransport(wsTransport)
  agent.registerOutboundTransport(httpTransport)
  
  return agent
}

const main = async () => {
  
  try {
    log('Start')
    const agent = makeAgent(walletId, walletKey);
  
    await agent.initialize()

    const mediator = (await agent.connections.getAll()).pop()
    console.log(`connection id = ${mediator!.id}`) 

    const messageCount = Number(process.env.MESSAGE_COUNT ?? 0)

    for (const i of Array.from({ length: messageCount })) {      
      console.log(`sending message ${i}`)
      await agent.basicMessages.sendMessage(mediator!.id, `Hello, Agent ${i}`);
    }

    log('End')
  } catch (error) {
    log(`Error: ${error}`, Style.BrightRed)
    process.exit(ExitCodes.TestFail)
  }

  process.exit(ExitCodes.Success)
}

main()
