require('dotenv').config();
const { MongoClient } = require('mongodb');

async function test() {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db('recycleDB');
    const users = await db.collection('users').find({}).toArray();
    console.log(JSON.stringify(users, null, 2));
  } finally {
    await client.close();
  }
}
test();
