(function() {
  const path = require('path');
  const mongo = require('./mongo');

  module.exports = exports = function(argv) {
    const storage = {};

    if (argv.collection == null) {
      argv.collection = path.basename(argv.data).replace(/^[^a-z]+/i, '');
    }

    storage.copyFile = async function (sLoc, tLoc, cb) {
      try {
        const db = await mongo.db(argv);
        const doc = await db.collection(argv.collection).findOne({ _id: sLoc });
        const query = { _id: tLoc };
        const update = { $set: { _id: tLoc, page: doc.page } };
        const options = { upsert: true };
        await db.collection(argv.collection).updateOne(query, update, options);
        return cb();
      } catch (err) {
        console.error(err);
        return cb(err);
      }
    }

    storage.exists = async function (loc, cb) {
      try {
        const db = await mongo.db(argv);
        const doc = await db.collection(argv.collection).findOne({ _id: loc });
        return cb(!!doc);
      } catch (err) {
        console.error(err);
        return cb(false);
      }
    }

    storage.readFile = async function (loc, cb) {
      try {
        const db = await mongo.db(argv);
        const doc = await db.collection(argv.collection).findOne({ _id: loc });
        return cb(null, JSON.stringify(doc.page));
      } catch (err) {
        console.error(err);
        return cb(err);
      }
    }

    storage.readDir = async function (loc, cb) {
      try {
        const db = await mongo.db(argv);
        const docs = await db.collection(argv.collection).find({}).project({ _id: 1, page: 0 }).toArray();
        return cb(null, docs.map(doc => doc._id));
      } catch (err) {
        console.error(err);
        return cb(err);
      }
    }

    storage.rename = async function (sLoc, tLoc, cb) {
      try {
        const db = await mongo.db(argv);
        const doc = await db.collection(argv.collection).findOne({ _id: sLoc });
        await db.collection(argv.collection).deleteOne({ _id: sLoc });
        const query = { _id: tLoc };
        const update = { $set: { _id: tLoc, page: doc.page } };
        const options = { upsert: true };
        await db.collection(argv.collection).updateOne(query, update, options);
        return cb();
      } catch (err) {
        console.error(err);
        return cb(err);
      };
    }

    storage.unlink = async function (loc, cb) {
      try {
        const db = await mongo.db(argv);
        await db.collection(argv.collection).deleteOne({ _id: loc });
        return cb();
      } catch (err) {
        console.error(err);
        return cb(err);
      }
    }

    storage.writeFile = async function (loc, page, cb) {
      try {
        const db = await mongo.db(argv);
        const query = { _id: loc };
        const update = { $set: { _id: loc, page: JSON.parse(page) } };
        const options = { upsert: true };
        await db.collection(argv.collection).updateOne(query, update, options);
        return cb();
      } catch (err) {
        console.error(err);
        return cb(err);
      };
    }

    return storage;
  };

}).call(this);
