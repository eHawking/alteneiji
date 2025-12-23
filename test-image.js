// Quick test for Gemini image generation
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

if (!apiKey) {
    console.error('No API key found!');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testImageGeneration() {
    try {
        console.log('\n--- Testing gemini-2.5-flash-image ---');

        const imageModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-image'
        });

        const result = await imageModel.generateContent(
            'Create a professional social media marketing image for organic spices import business'
        );

        const response = await result.response;

        console.log('Response received!');
        console.log('Candidates:', response.candidates?.length || 0);

        if (response?.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    console.log('Text:', part.text.substring(0, 200));
                }
                if (part.inlineData) {
                    console.log('IMAGE FOUND!');
                    console.log('MIME Type:', part.inlineData.mimeType);
                    console.log('Data length:', part.inlineData.data?.length || 0);

                    // Save the image
                    const buffer = Buffer.from(part.inlineData.data, 'base64');
                    fs.writeFileSync('test-output.png', buffer);
                    console.log('Image saved to test-output.png');
                }
            }
        } else {
            console.log('No parts in response');
            console.log('Full response:', JSON.stringify(response, null, 2).substring(0, 1000));
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
    }
}

testImageGeneration();
