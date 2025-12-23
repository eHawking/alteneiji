import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize variables for dynamic API key management
let genAI = null;
let model = null;
let currentApiKey = process.env.GEMINI_API_KEY || '';

/**
 * Initialize or reinitialize the Gemini client with an API key
 * @param {string} apiKey - The API key to use
 */
function initializeClient(apiKey) {
    if (!apiKey || apiKey === '') {
        genAI = null;
        model = null;
        currentApiKey = '';
        return false;
    }

    try {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
        });
        currentApiKey = apiKey;
        return true;
    } catch (error) {
        console.error('Failed to initialize Gemini client:', error);
        return false;
    }
}

// Initialize with env variable if available
if (currentApiKey) {
    initializeClient(currentApiKey);
}

/**
 * Get API key from database settings
 */
async function getApiKeyFromDatabase() {
    try {
        const { query } = await import('./database.js');
        const results = await query(
            "SELECT setting_value FROM settings WHERE setting_key = 'gemini_api_key' LIMIT 1"
        );
        if (results && results.length > 0) {
            return results[0].setting_value;
        }
    } catch (error) {
        // Database might not be connected yet
    }
    return null;
}

/**
 * Ensure the client is configured, checking database if not
 */
async function ensureConfigured() {
    // Already configured
    if (genAI !== null && model !== null) {
        return true;
    }

    // Try to get from database
    const dbKey = await getApiKeyFromDatabase();
    if (dbKey) {
        return initializeClient(dbKey);
    }

    // Check if env was updated at runtime
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== currentApiKey) {
        return initializeClient(process.env.GEMINI_API_KEY);
    }

    return false;
}

/**
 * Check if Gemini AI is configured
 * @returns {boolean} Whether AI is available
 */
export function isConfigured() {
    return genAI !== null && model !== null;
}

/**
 * Generate content using Gemini AI
 * @param {string} prompt - The prompt to send to AI
 * @param {Object} options - Generation options
 * @returns {Promise<string>} Generated text
 */
export async function generateContent(prompt, options = {}) {
    // Try to ensure configured before checking
    await ensureConfigured();

    if (!isConfigured()) {
        throw new Error('Gemini AI is not configured. Please add GEMINI_API_KEY to .env file or save it in Settings.');
    }

    try {
        const generationConfig = {
            temperature: options.temperature ?? 0.7,
            topP: options.topP ?? 0.95,
            topK: options.topK ?? 40,
            maxOutputTokens: options.maxTokens ?? 2048,
        };

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig,
        });

        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini AI error:', error);
        throw new Error(`AI generation failed: ${error.message}`);
    }
}

/**
 * Generate an image using Gemini's image generation model
 * @param {string} prompt - Description of the image to generate
 * @returns {Promise<string>} Base64 encoded image or URL
 */
export async function generateImage(prompt) {
    await ensureConfigured();

    if (!genAI) {
        throw new Error('Gemini AI is not configured');
    }

    try {
        // Use the image generation model
        const imageModel = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                responseModalities: ['Text', 'Image']
            }
        });

        const result = await imageModel.generateContent({
            contents: [{
                role: 'user',
                parts: [{
                    text: `Generate a professional social media marketing image for: ${prompt}. 
                           The image should be vibrant, modern, and suitable for business marketing. 
                           Style: Premium, clean, corporate but engaging.`
                }]
            }]
        });

        const response = await result.response;

        // Check if image was generated
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return {
                    base64: part.inlineData.data,
                    mimeType: part.inlineData.mimeType
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Gemini image generation error:', error);
        // Return null instead of throwing to allow fallback
        return null;
    }
}

/**
 * Generate SEO metadata for content
 * @param {string} content - The content to analyze
 * @param {string} contentType - Type of content (page, product, blog)
 * @returns {Promise<Object>} SEO metadata
 */
export async function generateSEO(content, contentType = 'page') {
    const prompt = `You are an SEO expert. Analyze the following ${contentType} content and generate optimized SEO metadata.

Content:
${content}

Generate a JSON response with the following structure:
{
    "meta_title": "SEO optimized title (max 60 characters)",
    "meta_description": "Compelling meta description (max 160 characters)",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "og_title": "Open Graph title for social sharing",
    "og_description": "Open Graph description for social sharing",
    "suggestions": ["improvement suggestion 1", "improvement suggestion 2"]
}

Focus on:
- UAE trading, import/export industry keywords
- Sustainability and organic products
- Professional B2B tone
- Local SEO for Dubai/UAE

Return ONLY valid JSON, no markdown or additional text.`;

    const response = await generateContent(prompt, { temperature: 0.5 });

    try {
        // Clean response of potential markdown formatting
        const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error('Failed to parse SEO response:', e);
        return {
            meta_title: '',
            meta_description: '',
            keywords: [],
            og_title: '',
            og_description: '',
            suggestions: [],
            raw_response: response
        };
    }
}

/**
 * Generate social media post content
 * @param {Object} options - Post generation options
 * @returns {Promise<Object>} Generated posts for each platform
 */
export async function generateSocialPost(options) {
    const { topic, tone = 'professional', platforms = ['instagram', 'facebook', 'twitter', 'linkedin'], includeHashtags = true } = options;

    const prompt = `You are a social media marketing expert for Alteneiji Group, a Dubai-based import/export company led by an Emirati woman entrepreneur.

Generate engaging social media posts for the following platforms: ${platforms.join(', ')}

Topic/Content: ${topic}

Tone: ${tone}

Company Context:
- Alteneiji Group specializes in import/export, shipping, logistics, and business consultancy
- Focus on organic, sustainable, eco-friendly products
- Emirati woman-owned, based in Dubai, UAE
- Values: Trust, Quality, Innovation, Sustainability

Generate a JSON response with this structure:
{
    "instagram": {
        "content": "Instagram post text (engaging, visual-focused)",
        "hashtags": ["relevant", "hashtags"],
        "best_posting_time": "suggested posting time",
        "content_type_suggestion": "carousel/reel/story"
    },
    "facebook": {
        "content": "Facebook post text (professional, informative)",
        "hashtags": ["relevant", "hashtags"],
        "best_posting_time": "suggested posting time"
    },
    "twitter": {
        "content": "Tweet text (max 280 characters, concise)",
        "hashtags": ["relevant", "hashtags"],
        "best_posting_time": "suggested posting time"
    },
    "linkedin": {
        "content": "LinkedIn post text (professional, B2B focused)",
        "hashtags": ["relevant", "hashtags"],
        "best_posting_time": "suggested posting time"
    },
    "youtube": {
        "title": "Video title suggestion",
        "description": "Video description",
        "tags": ["relevant", "tags"]
    }
}

${includeHashtags ? 'Include relevant hashtags for each platform.' : 'Do not include hashtags.'}

Use emojis appropriately for each platform.
Return ONLY valid JSON, no markdown or additional text.`;

    const response = await generateContent(prompt, { temperature: 0.8 });

    try {
        const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error('Failed to parse social post response:', e);
        return {
            error: 'Failed to generate posts',
            raw_response: response
        };
    }
}

/**
 * Generate marketing campaign ideas
 * @param {Object} options - Campaign options
 * @returns {Promise<Object>} Campaign ideas and content
 */
export async function generateMarketingCampaign(options) {
    const { goal, targetAudience, budget = 'medium', duration = '1 month' } = options;

    const prompt = `You are a marketing strategist for Alteneiji Group, a Dubai-based import/export company.

Create a marketing campaign with the following parameters:
- Goal: ${goal}
- Target Audience: ${targetAudience}
- Budget Level: ${budget}
- Duration: ${duration}

Company Context:
- Emirati woman-owned trading company
- Specializes in sustainable, organic products
- Services: Import/Export, Logistics, Consultancy
- Based in Dubai, serving UAE and international markets

Generate a JSON response with this structure:
{
    "campaign_name": "Creative campaign name",
    "tagline": "Campaign tagline",
    "summary": "Brief campaign overview",
    "objectives": ["objective1", "objective2"],
    "target_segments": ["segment1", "segment2"],
    "channels": ["channel1", "channel2"],
    "content_calendar": [
        {
            "week": 1,
            "theme": "Theme for the week",
            "activities": ["activity1", "activity2"]
        }
    ],
    "key_messages": ["message1", "message2"],
    "kpis": ["KPI1", "KPI2"],
    "budget_allocation": {
        "digital_ads": "percentage",
        "content_creation": "percentage",
        "influencer": "percentage",
        "other": "percentage"
    },
    "email_templates": [
        {
            "subject": "Email subject",
            "preview_text": "Preview text",
            "key_points": ["point1", "point2"]
        }
    ]
}

Return ONLY valid JSON, no markdown or additional text.`;

    const response = await generateContent(prompt, { temperature: 0.7 });

    try {
        const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error('Failed to parse marketing campaign response:', e);
        return {
            error: 'Failed to generate campaign',
            raw_response: response
        };
    }
}

/**
 * Analyze and optimize content
 * @param {string} content - Content to analyze
 * @returns {Promise<Object>} Analysis and suggestions
 */
export async function analyzeContent(content) {
    const prompt = `Analyze the following business content for a Dubai-based import/export company and provide optimization suggestions:

Content:
${content}

Provide a JSON response with:
{
    "readability_score": "score out of 10",
    "tone_analysis": "professional/casual/formal",
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"],
    "keyword_density": {"keyword": "percentage"},
    "cta_suggestions": ["suggested CTA 1", "suggested CTA 2"],
    "rewritten_version": "Optimized version of the content"
}

Return ONLY valid JSON, no markdown or additional text.`;

    const response = await generateContent(prompt, { temperature: 0.5 });

    try {
        const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error('Failed to parse content analysis:', e);
        return {
            error: 'Failed to analyze content',
            raw_response: response
        };
    }
}

export default {
    isConfigured,
    generateContent,
    generateImage,
    generateSEO,
    generateSocialPost,
    generateMarketingCampaign,
    analyzeContent
};
