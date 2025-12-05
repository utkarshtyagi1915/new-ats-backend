const Groq = require("groq-sdk");

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

exports.generateJobDescription = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    // LLM prompt
    const prompt = `Write a professional job description for the role: ${role}.
    Include responsibilities, required skills, and experience.`;

    // Call Groq LLM
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
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
