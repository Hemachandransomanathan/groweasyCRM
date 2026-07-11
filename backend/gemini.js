require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash"
    });

    try {
        const result = await model.generateContent("Say Hello");

        console.log(result.response.text());
    } catch (err) {
        console.dir(err, { depth: null });
    }
}

main();