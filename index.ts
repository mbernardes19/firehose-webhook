import { CredentialSession } from '@atproto/api'
import { Create } from '@atproto/sync'
import { RepoRecord } from '@atproto/lexicon'
import { CURSOR_KEY, CURSOR_TABLE, getItem, putItem } from './db.js'
import dotenv from 'dotenv'
import { Firehose, ParsedCommit } from '@skyware/firehose'

dotenv.config()

export type Account = {
    did: string
    webhookUrl: string
    session?: CredentialSession
    serviceUrl?: string
}

const isMentioningAccount = (record: RepoRecord, accountDid: string) => {
    return record.facets?.some(
        (facet: { features: any[] }) => facet?.features?.some(
            (feature: { did: string }) => feature?.did === accountDid)
        )
}

const sendMessage = async (op: Create, account: Account) => {
    console.log('=== sending request to', account.webhookUrl)
    try {
        const res = await fetch(account.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(op)
        })
        const resText = await res.text()
        console.log('=== response', resText)
    } catch (err) {
        console.log('=== request failed', err)
    }
}

let firehose: Firehose
let currentCursor = '0'

const main = async () => {
    const subscribedAccounts = JSON.parse(process.env.ACCOUNTS!)
    console.log('=== subscribedAccounts', subscribedAccounts)

    const cursor = await getItem(CURSOR_TABLE, CURSOR_KEY)

    firehose = new Firehose({
        cursor: cursor ? cursor?.value : undefined
    })
    currentCursor = cursor?.value
    firehose.on('commit', async (message: ParsedCommit) => {
        message.ops.map(op => {
            currentCursor = message.seq.toString()
            if (op.action === 'create' && op.path.includes('post')) {
                const uri = "at://" + message.repo + "/" + op.path;
                const parsedSubscribedAccounts = JSON.parse(subscribedAccounts) as Account[]
                parsedSubscribedAccounts.map(account => {
                    if (isMentioningAccount(op?.record, account.did)) {
                        console.log('=== MENTIONED ACCOUNT', op)
                        sendMessage({
                            ...op,
                            // @ts-ignore
                            uri
                        }, account)
                    }
                })
            }
        })
    })
    firehose.on('error', ({cursor, error}) => {
        putItem(CURSOR_TABLE, CURSOR_KEY, cursor)
        console.error('Error in firehose', error)
    })
    firehose.on('websocketError', ({cursor, error}) => {
        putItem(CURSOR_TABLE, CURSOR_KEY, cursor)
        console.error('Error in firehose websocket', error)
    })
    firehose.on('close', (cursor) => {
        putItem(CURSOR_TABLE, CURSOR_KEY, cursor)
        console.warn('Firehose closed, starting again...')
        firehose.start()
    })
    firehose.start()
}

try {
    main()
} catch (err) {
    console.error(err)
    // @ts-ignore
    firehose.removeAllListeners()
}

process.on('SIGINT', async () => {
    console.log('Caught interrupt signal (Ctrl + C), cleaning up...');
    await putItem(CURSOR_TABLE, CURSOR_KEY, currentCursor)
    process.exit(0);
  });
  
  // You can also listen for other signals like SIGTERM (used by Kubernetes, for example)
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, cleaning up...');
    await putItem(CURSOR_TABLE, CURSOR_KEY, currentCursor)
    process.exit(0);
  });