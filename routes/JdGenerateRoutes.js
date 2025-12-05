const express = require("express");
const router = express.Router();
const { generateJobDescription } = require("../controllers/jobDescriptionController");

router.post("/", generateJobDescription);

module.exports = router;
