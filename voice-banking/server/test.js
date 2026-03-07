const { GoogleGenerativeAI } = require('@google/generative-ai');
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyA9_oByFvifll1gjor6Mog0nk15yq0ZLBk');

async function testModel(modelName) {
    try {
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.embedContent('hello world');
        console.log(`Model ${modelName} success! Embedding length: ${result.embedding.values.length}`);
    } catch (e) {
        console.error(`Model ${modelName} error: ${e.message}`);
    }
}

async function run() {
    await testModel('embedding-001');
    await testModel('text-embedding-004');
    await testModel('gemini-embedding-001');
}

run();
