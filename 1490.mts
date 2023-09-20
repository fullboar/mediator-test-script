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
import { anoncreds } from '@hyperledger/anoncreds-react-native'
import { ariesAskar } from '@hyperledger/aries-askar-react-native'
import { indyVdr } from '@hyperledger/indy-vdr-react-native'

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

const main = async () => {
  
  log('Start')
  const modules = agentModules({indyNetworks: ledgers, mediatorInvitationUrl: defaultMediatorUrl})

  const agent = new Agent({
    config: {
      label: 'Test Agent',
      walletConfig: {
        id: 'abc123',
        key: 'abc123',
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
  
  log('End')

  process.exit(0)
}

main()
