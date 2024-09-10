# Firehose Webhook
It's an [AT Protocol](https://atproto.com/) [Firehose](https://docs.bsky.app/docs/advanced-guides/firehose) consumer service built for Bluesky.
This consumer was built with the intention of allowing developers to deploy multiple Bluesky bots as serverless functions, saving them from having to deploy each bot as a long-running instance on a cloud provider. Hence, with this approach, multiple bots can listen to the same firehose consumer service, potentially saving costs of cloud provider usage. 

## How it works
It uses the Firehose listener from [`@skyware/firehose`](https://github.com/skyware-js/firehose) to listen to all commits on the [Relay](https://github.com/skyware-js/firehose) and verifies if there's a mention ("@") to any of the accounts configured in the ACCOUNTS json string that's set as an environment variable. If there's a mention, then it calls the webhook URL associated to that account.

It also persists the latest cursor value in case of an error. Then, when the listeners restarts, it fetches the stored cursor and starts to listen from that point - ensuring that no commits are lost.

To communicate with the DB we use the [DynamoDB client](https://www.npmjs.com/package/@aws-sdk/client-dynamodb).

## Deployment Setup
The recommended deployment setup is to deploy the service on AWS ECS (Fargate) and utilize AWS Dynamo DB to persist the cursor.

## AWS
This service was built to be deployed on AWS, deploying it to another cloud provider will require some changes on:
- package.json scripts
- DB setup (`db.ts`)