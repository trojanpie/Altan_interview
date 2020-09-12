module.exports = app => {
  const upload = require("../controller/upload.js");
  var router = require("express").Router();

  router.get("/", upload.create);
  router.get("/pause", upload.pause);
  router.get("/resume", upload.resume);
  router.get("/terminate", upload.terminate);
  router.get("/status",upload.status);
  app.use('/upload', router);
};