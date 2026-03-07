const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let groqClient = null;
let genAI = null;

const getGroq = () => {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

const getGenAI = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

const buildPrompt = (text, userData) => {
  const userContext = `
User Profile:
- Name: ${userData.name}
- Language preference: ${userData.language}

Accounts:
${userData.accounts.map(a => 
  `- ${a.type.charAt(0).toUpperCase() + a.type.slice(1)} (${a.number}): ₹${a.balance.toLocaleString('en-IN')}`
).join('\n')}

Recent Transactions:
${userData.transactions.map(t => 
  `- ${t.type === 'credit' ? '+' : '-'}₹${t.amount} | ${t.merchant} | ${t.category} | ${new Date(t.date).toLocaleDateString('en-IN')}`
).join('\n')}
`;

  return {
    system: `You are VoiceBank AI, a helpful and friendly voice banking assistant for ${userData.name}.
You help users check balances, view transactions, understand spending, and get banking information.
Always respond in a warm, conversational tone suitable for being spoken aloud.
Keep responses concise (2-3 sentences max) and use Indian Rupee (₹) formatting.
If the user speaks in Hindi or another Indian language, respond in that language.
${userContext}`,
    user: `User query: "${text}"\n\nRespond naturally as a banking assistant. Include specific numbers and amounts when relevant.`
  };
};

// Primary: Groq (fast ~200ms)
const processWithGroq = async (text, userData) => {
  const groq = getGroq();
  const { system, user } = buildPrompt(text, userData);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return completion.choices[0].message.content.trim();
};

// Fallback: Gemini
const processWithGemini = async (text, userData) => {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const { system, user } = buildPrompt(text, userData);

  const result = await model.generateContent(`${system}\n\n${user}`);
  return result.response.text().trim();
};

const processVoiceQuery = async (text, userData) => {
  const startTime = Date.now();
  let usedModel = 'groq';

  try {
    let response;

    try {
      // Try Groq first
      response = await processWithGroq(text, userData);
      console.log(`✅ Groq response in ${Date.now() - startTime}ms`);
    } catch (groqError) {
      // Groq failed → fallback to Gemini
      console.warn('⚠️ Groq failed, falling back to Gemini:', groqError.message);
      usedModel = 'gemini';
      response = await processWithGemini(text, userData);
      console.log(`✅ Gemini fallback response in ${Date.now() - startTime}ms`);
    }

    return {
      success: true,
      query: text,
      response,
      model: usedModel,
      responseMs: Date.now() - startTime,
      timestamp: new Date()
    };

  } catch (error) {
    // Both failed
    console.error('❌ Both Groq and Gemini failed:', error.message);
    return {
      success: false,
      query: text,
      response: 'I am having trouble processing your request right now. Please try again in a moment.',
      model: 'none',
      responseMs: Date.now() - startTime,
      timestamp: new Date()
    };
  }
};

module.exports = { processVoiceQuery };