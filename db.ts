import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_DEFAULT_REGION
});

const dynamoDB = DynamoDBDocumentClient.from(ddbClient);

export const CURSOR_TABLE = process.env.CURSOR_TABLE!
export const CURSOR_KEY = process.env.CURSOR_KEY!

export async function putItem(table: string, id: string, value: string) {
  const params = {
    TableName: table,
    Item: {
      id,
      value
    },
  };

  try {
    await dynamoDB.send(new PutCommand(params));
  } catch (error) {
    console.error("Error adding/updating item:", error);
  }
}

export async function getItem(table: string, id: string) {
  const params = {
    TableName: table,
    Key: {
      id
    },
  };

  try {
    const data = await dynamoDB.send(new GetCommand(params));
    console.log("Item fetched:", data.Item);
    return data.Item
  } catch (error) {
    console.error("Error fetching item:", error);
  }
}

export default dynamoDB;
