const { AzureOpenAI } = require("openai");

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
});

exports.generateJobDescription = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    // LLM prompt
    const prompt = `Write a professional job description for the role: ${role}.
    Include responsibilities, required skills, and experience.`;

    // Call OpenAI LLM
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    const jobDescription = response.choices[0]?.message?.content;

    res.json({
      success: true,
      role,
      jobDescription,
    });

  } catch (error) {
    console.error("LLM Error:", error);
    res.status(500).json({ success: false, error: "Failed to generate job description" });
  }
};
