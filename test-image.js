// Quick test for Gemini image generation
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const API_KEY = 'AIzaSyAfRg4URh4xe7pLEXhyKLktc5udNwCctyc';

async function testImageGeneration() {
    console.log('Testing Gemini Image Generation...\n');

    const genAI = new GoogleGenerativeAI(API_KEY);

    // Test with gemini-2.5-flash-image (Nano Banana)
    console.log('1. Testing gemini-2.5-flash-image...');
    try {
        const imageModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-image'
        });

        const result = await imageModel.generateContent(
            'Create a professional social media marketing image for a Dubai trading company. Modern, vibrant, premium business aesthetic.'
        );

        const response = await result.response;

        console.log('Response received!');
        console.log('Candidates:', response.candidates?.length || 0);

        if (response?.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    console.log('Text response:', part.text.substring(0, 100));
                }
                if (part.inlineData) {
                    console.log('IMAGE FOUND! MimeType:', part.inlineData.mimeType);
                    console.log('Data length:', part.inlineData.data?.length || 0);

                    // Save the image
                    const buffer = Buffer.from(part.inlineData.data, 'base64');
                    fs.writeFileSync('test-generated-image.png', buffer);
                    console.log('Image saved to test-generated-image.png!');
                }
            }
        } else {
            console.log('No parts found in response');
            console.log('Full response:', JSON.stringify(response, null, 2).substring(0, 500));
        }

    } catch (error) {
        console.log('ERROR with gemini-2.5-flash-image:', error.message);
        console.log('Full error:', error);
    }

    console.log('\n--- Test Complete ---');
}

testImageGeneration();
