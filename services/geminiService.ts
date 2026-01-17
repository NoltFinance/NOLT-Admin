
import { GoogleGenAI } from "@google/genai";
import { ReviewRequest } from "../types";

export const getDashboardInsights = async (requests: ReviewRequest[]) => {
  // Always use a named parameter and obtain API key directly from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze the following financial review queue and provide a short, professional executive summary (max 3 sentences).
    Focus on the distribution of request types and the total volume.
    
    Data:
    ${JSON.stringify(requests.map(r => ({ type: r.type, amount: r.amount, status: r.status })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });
    
    // Use .text property instead of method as per latest SDK guidelines
    return response.text;
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Unable to generate insights at this time. Please check your network connection.";
  }
};
