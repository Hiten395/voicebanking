const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

const getGenAI = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

const processVoiceQuery = async (text, userData) => {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const userContext = `
User Profile:
- Name: ${userData.name}
- Language preference: ${userData.language}

Accounts:
${userData.accounts.map(a => `- ${a.type.charAt(0).toUpperCase() + a.type.slice(1)} (${a.number}): ₹${a.balance.toLocaleString('en-IN')}`).join('\n')}

Recent Transactions:
${userData.transactions.map(t => `- ${t.type === 'credit' ? '+' : '-'}₹${t.amount} | ${t.merchant} | ${t.category} | ${new Date(t.date).toLocaleDateString('en-IN')}`).join('\n')}
`;

    const prompt = `You are VoiceBank AI, a helpful and friendly voice banking assistant for ${userData.name}. 
You help users check balances, view transactions, understand spending, and get banking information.
Always respond in a warm, conversational tone suitable for being spoken aloud.
Keep responses concise (2-3 sentences max) and use Indian Rupee (₹) formatting.
If the user speaks in Hindi or another Indian language, respond in that language.

${userContext}

User query: "${text}"

Respond naturally as a banking assistant. Include specific numbers and amounts when relevant.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return {
      success: true,
      query: text,
      response: response,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('AI Service error:', error.message);
    return {
      success: false,
      query: text,
      response: 'I apologize, I am having trouble processing your request right now. Please try again in a moment.',
      timestamp: new Date()
    };
  }
};

module.exports = { processVoiceQuery };
