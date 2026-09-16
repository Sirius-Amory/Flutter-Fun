import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const tableName = "leaderboard";

export async function submitScore(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const body = (await request.json()) as any;
  const { playerName, score } = body ?? {};

  if (typeof playerName !== "string" || playerName.length < 1 || playerName.length > 20) {
    return { status: 400, body: "Invalid player name" };
  }
  if (typeof score !== "number" || score < 0 || score > 999999) {
    return { status: 400, body: "Invalid score" };
  }

  const client = TableClient.fromConnectionString(connectionString, tableName);
  await client.createTable();

  await client.createEntity({
    partitionKey: "leaderboard",
    rowKey: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerName,
    score,
  });

  return { status: 200, jsonBody: { success: true } };
}

app.http("submitScore", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: submitScore,
});