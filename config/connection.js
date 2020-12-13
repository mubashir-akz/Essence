const mongoClient = require("mongodb").MongoClient;
const secret = require('../config/secret')
const state = {
  db: null,
};
module.exports.connect = function (done) {
  const url = secret.dbURL
  const dbname = "Essence";

  mongoClient.connect(url, { useUnifiedTopology: true }, (err, data) => {
    if (err) return done(err);
    state.db = data.db(dbname);
    done();
  });
};
module.exports.get = function () {
  return state.db;
};
