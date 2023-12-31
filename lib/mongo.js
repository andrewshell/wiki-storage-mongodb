const { MongoClient } = require('mongodb');

const clients = {};

async function db(argv) {
  if (clients[argv.database.url] == null) {
    clients[argv.database.url] = new MongoClient(argv.database.url);
    await clients[argv.database.url].connect();
  }

  return clients[argv.database.url].db();
}

function closeAll() {
  return Promise.all(Object.values(clients).map((client) => client.close()));
}

module.exports = {
  db,
  closeAll
}
