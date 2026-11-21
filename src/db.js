import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const TABLE = process.env.TURNOS_TABLE || "Turnos";

export function makeClient() {
  const raw = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
  });
  return DynamoDBDocumentClient.from(raw);
}

// Crea la tabla si no existe. Diseño single-table:
//   pk = DIA#2026-11-25   sk = HORA#09:00
//   GSI "por-cliente": cliente (hash) + fecha_hora (range)
export async function initTable(doc, table = TABLE) {
  try {
    await doc.send(new DescribeTableCommand({ TableName: table }));
    return false;
  } catch (e) {
    if (e.name !== "ResourceNotFoundException") throw e;
  }
  await doc.send(new CreateTableCommand({
    TableName: table,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "sk", AttributeType: "S" },
      { AttributeName: "cliente", AttributeType: "S" },
      { AttributeName: "fecha_hora", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "sk", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [{
      IndexName: "por-cliente",
      KeySchema: [
        { AttributeName: "cliente", KeyType: "HASH" },
        { AttributeName: "fecha_hora", KeyType: "RANGE" },
      ],
      Projection: { ProjectionType: "ALL" },
    }],
  }));
  return true;
}
