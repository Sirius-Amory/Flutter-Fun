import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING ?? process.env.AzureWebJobsStorage;
const tableName = "leaderboard";

export async function getLeaderboard(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!connectionString) {
    return { status: 500, body: "Storage is not configured" };
  }

  const scores: Array<{ playerName: string; score: number; age: number; rank: string; causeOfDeath: string }> = [];

  try {
    const client = TableClient.fromConnectionString(connectionString, tableName);
    const entities = client.listEntities();
    for await (const entity of entities) {
      scores.push({
        playerName: entity.playerName as string,
        score: entity.score as number,
        age: entity.age as number,
        rank: entity.rank as string,
        causeOfDeath: entity.causeOfDeath as string,
      });
    }
  } catch (err: any) {
    if (err.statusCode !== 404) throw err;
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 10).map(({ playerName, age, rank, causeOfDeath }) => ({
    playerName,
    age,
    rank,
    causeOfDeath,
  }));

  return { status: 200, jsonBody: top };
}

app.http("getLeaderboard", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getLeaderboard,
});