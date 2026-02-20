import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file");

    // 1. High-Accuracy Transcription
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
    });

    // 2. Multilingual Logic with "Speech-First" Instructions
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `Your name is B-AIR, a premium AI assistant created by Babar.
          CORE DIRECTIVES:
          - Detect user language accurately.
          - If Urdu: Reply ONLY in pure Urdu script. No English words.
          - If English: Reply in clear English.
          - STYLE: Friendly, concise, and helpful.
          - SPEECH OPTIMIZATION: Do not use emojis, hashtags, or complex punctuation. 
          - LENGTH: Maximum 2 short sentences.` 
        },
        { role: "user", content: transcription.text }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6, 
    });

    const aiResponse = chatCompletion.choices[0].message.content;

    return new Response(JSON.stringify({ text: aiResponse }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error("B-AIR Backend Error:", err);
    return new Response(JSON.stringify({ error: "I'm having trouble thinking right now." }), { status: 500 });
  }
}