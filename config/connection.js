const mongoClient = require("mongodb").MongoClient;

const state = {
  db: null,
};
module.exports.connect = function (done) {
  const url =
    "mongodb+srv://mubashir:MXfiq5n5ThtTjLtC@cluster0.qamji.mongodb.net/essence?retryWrites=true&w=majority";
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
