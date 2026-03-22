import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI environment variable is not set");

const client = new MongoClient(uri);
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (!db) {
    await client.connect();
    db = client.db("haven_bot");
  }
  return db;
}
