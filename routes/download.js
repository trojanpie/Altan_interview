module.exports = app => {
  const download = require("../controller/download.js");
  var router = require("express").Router();

  router.post("/", download.download);
  router.get("/pause", download.pause);
  router.get("/resume", download.resume);
  router.get("/terminate", download.terminate);
  router.get("/status",download.status);
  router.get("/file",download.file);
  app.use('/download', router);
};