const dbConfig = require("../config/key.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.mongoURI;
db.upload = require('../models/schema.upload.js')(mongoose);

module.exports = db;