import express from "express";
import fs from "fs";
import { applyManualRedactions } from "./src/applyManualRedactions.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// app.post("/redact", async (req, res) => {
  // const { redactions, ogUrl, docFileID } = req.body;

  // const output = await applyManualRedactions(redactions, ogUrl, docFileID);

  // res.download(output);
// });

app.post("/redact", async (req, res) => {
        //const { redactions, ogUrl, docFileID } = req.body;
        const { redactions, docFileID, wsName } = req.body;
  try {
        //console.log('working')
    const output = await applyManualRedactions(redactions, docFileID, wsName);
	res.status(200).send("Redacted File stored Successfully");
    console.log(output);
          //res.download(output);
  } catch (error) {
    console.error("Redaction failed:", error);
    res.status(500).send("Error processing redactions.");
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));