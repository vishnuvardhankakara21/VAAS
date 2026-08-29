import express from "express";
import cors from "cors";
import { generateAIResponse } from "./services/ai.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/status", (req, res) => {
  res.json({
    message: "Backend is connected to VAAS",
  });
});

app.post("/api/chat", async (req, res) => {
  const message = req.body.message;

  try {
    const response = await generateAIResponse(message);

    res.json({
      response: response,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

app.listen(5000, () => {
  console.log("VAAS backend running on port 5000");
});