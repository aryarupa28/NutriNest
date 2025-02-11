require('dotenv').config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = 3001;

app.use(cors());

app.get("/recipeStream", (req, res) => {
  const { ingredients, mealType, cuisine, cookingTime, complexity } = req.query;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (chunk) => {
    let chunkResponse;
    if (chunk.choices[0].finish_reason === "stop") {
      res.write(`data: ${JSON.stringify({ action: "close" })}\n\n`);
    } else {
      if (chunk.choices[0].delta.role && chunk.choices[0].delta.role === "assistant") {
        chunkResponse = {
          action: "start",
        };
      } else {
        chunkResponse = {
          action: "chunk",
          chunk: chunk.choices[0].delta.content,
        };
      }
      res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`);
    }
  };

  const prompt = [
    "Generate a recipe that incorporates the following details:",
    `[Ingredients: ${ingredients}]`,
    `[Meal Type: ${mealType}]`,
    `[Cuisine Preference: ${cuisine}]`,
    `[Cooking Time: ${cookingTime}]`,
    `[Complexity: ${complexity}]`,
    "Please provide a detailed recipe, including steps for preparation and cooking. Only use the ingredients provided.",
    "The recipe should highlight the fresh and vibrant flavors of the ingredients.",
    "Also give the recipe a suitable name in its local language based on cuisine preference."
  ];

  const messages = [
    { role: "system", content: prompt.join(" ") },
  ];

  fetchOpenAICompletionsStream(messages, sendEvent);

  req.on("close", () => {
    res.end();
  });
});

async function fetchOpenAICompletionsStream(messages, callback) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const aiModel = "gpt-4-1106-preview";

  try {
    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: messages,
      temperature: 1,
      stream: true,
    });

    for await (const chunk of completion) {
      callback(chunk);
    }
  } catch (error) {
    console.error("Error fetching data from OpenAI API:", error);
    throw new Error("Error fetching data from OpenAI API.");
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
