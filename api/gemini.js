// api/gemini.js
// This is a Vercel serverless function that acts as a proxy to the Gemini API.
// It securely handles the API key, which should be set as an environment variable in Vercel.

export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Retrieve the API key from environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable not set.");
    return res.status(500).json({ error: "API key is not configured on the server." });
  }

  try {
    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required in the request body." });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    // Add system instruction to the payload if provided
    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    // Call the Google Gemini API
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Check if the API call was successful
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Google API Error:", errorText);
      return res.status(apiResponse.status).json({ error: `An error occurred with the Google API: ${errorText}` });
    }

    const data = await apiResponse.json();
    
    // Send the successful response from Gemini back to the client
    res.status(200).json(data);

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
}
