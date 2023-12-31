const storage = require('./lib/storage.mongodb');
const page = require('wiki-storage-file/lib/page');
module.exports = page.bind(null, storage);
