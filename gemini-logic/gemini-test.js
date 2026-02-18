import * as dotenv from "dotenv";

dotenv.config();
const apiKey = process.env.GEMINI_API_KEY;
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: "Speed of Light is?" }],
        },
      ],
    }),
  },
);
const data = await response.json();
if (!data.candidates?.length) {
  throw new Error("No response from Gemini");
}
const text = data.candidates[0].content.parts[0].text;
console.log(text);
