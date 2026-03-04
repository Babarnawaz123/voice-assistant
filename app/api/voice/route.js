import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file");

    if (!audioFile) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    // 1. High-Accuracy Transcription with Whisper v3
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      // Adding 'prompt' helps Whisper recognize Urdu/English switching better
      prompt: "This is a conversation in Urdu and English.", 
      response_format: "json",
    });

    const userText = transcription.text?.trim();

    // 🛡️ ACCOUNT PROTECTION: Skip LLM if audio is silent or just noise
    // This prevents "hallucination" requests from hitting your Llama 70B quota.
    const noisePatterns = ["Thank you.", "Watching", "Subtitle", "."];
    if (!userText || userText.length < 2 || noisePatterns.some(p => userText.includes(p))) {
      return NextResponse.json({ text: "" });
    }

    // 2. Multilingual Logic with "Speech-First" Instructions
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { 
          role: "system", 
          content: `Your name is B-AIR, a premium AI assistant created by Babar.
          CORE DIRECTIVES:
          - Automatically detect if the user is speaking Urdu or English.
          - If the user speaks Urdu: Respond ONLY in Urdu script (نستعلیق). Use simple, conversational Urdu.
          - If the user speaks English: Respond in clear, natural English.
          - STYLE: Friendly, punchy, and human. 
          - SPEECH RULES: No emojis, no markdown (* or **), no hashtags, and no complex punctuation.
          - CONSTRAINT: Max 2 short sentences. Be extremely brief for voice clarity.` 
        },
        { role: "user", content: userText }
      ],
      temperature: 0.5, // Lower temperature makes it faster and more predictable
      max_tokens: 150,  // Strictly limit tokens to prevent account overages
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({ 
      text: aiResponse,
      transcribed: userText 
    });

  } catch (err) {
    console.error("B-AIR Backend Error:", err);
    
    // Graceful error handling for Rate Limits (Error 429)
    if (err?.status === 429) {
      return NextResponse.json(
        { text: "Babar, we're talking a bit too fast for my circuits. Let's breathe for a second." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { text: "I'm having trouble thinking right now, Babar." },
      { status: 500 }
    );
  }
}