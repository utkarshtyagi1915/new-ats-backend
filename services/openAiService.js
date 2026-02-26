require("dotenv").config();
const { AzureOpenAI } = require("openai");

const openai = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
});

// Function to analyze resume against job description
const analyzeResume = async (resumeText, jobDescription) => {
  try {
    console.log("Starting resume analysis...");

    // Limit text length to avoid token limits
    const truncatedResumeText = resumeText.substring(0, 15000);
    const truncatedJobDescription = jobDescription.substring(0, 3000);

    const prompt = `Analyze the provided resume against the job description and generate a detailed evaluation report.

    Input:
    Resume Text: "${truncatedResumeText}"
    Job Description: "${truncatedJobDescription}"

    Evaluation Guidelines:
    1. Skills Matching
        - First extract ALL skills from resume (both technical and soft skills)
        - Then extract ALL required skills from job description
        - For each skill found in resume:
          * Check if it appears in job description
          * Note the context and proficiency level mentioned
          * Consider skill variations (e.g., "React.js" = "ReactJS")
          * Mark as true if found in job description, false if not
        - List all skills from resume regardless of job description match
        - Ensure no skills are missed even if they don't match

    2. Content Evaluation
    - Identify gaps and irrelevant content
    - Penalize vague or unrelated experiences
    - Evaluate clarity and specificity of achievements
    - Check for quantifiable results and impact

    3. Project/Internship Analysis
    - Match projects strictly based on JD relevance
    - Evaluate technology stack alignment
    - Check implementation context
    - Verify outcome relevance

    4. Resume Quality Metrics
    - Grammar and professionalism (independent of JD)
    - Structure and formatting
    - Content organization
    - Action verb usage
    - Quantifiable achievements

    Scoring Guidelines:
    - JScore (0-100): Strict evaluation of JD alignment
      70-100: Excellent match with specific skills and experience
      40-69: Partial match with some relevant experience
      0-39: Poor match with significant gaps

    - GScore (0-100): Overall resume quality
      70-100: Professional, well-structured, clear achievements
      40-69: Decent structure, needs minor improvements
      0-39: Major improvements needed

    Required Output Format (JSON only):
    {
        "Job Title Match": "Matched/Not Matched",
        "Skills": {
            "TechnicalSkills": {"skill": boolean},
            "SoftSkills": {"skill": boolean}
        },
        "Suggested Skills": ["skill1", "skill2"],
        "Matched Projects And Internships": [
            {
                "Project": "title",
                "Description": "alignment explanation"
            }
        ],
        "Rephrased Projects And Internships": [
            {
                "Original": "text",
                "Rephrased": ["point1", "point2", "point3"]
            }
        ],
        "Resume Improvement Suggestions": ["suggestion1", "suggestion2"],
        "Grammatical Check": "detailed review",
        "Project Title Description Check": [
            {
                "Project": "title",
                "Status": "Matched/Not Matched",
                "Explanation": "consistency review"
            }
        ],
        "Recruiter Tips": {
            "Suggestions": ["tip1", "tip2", "tip3"],
            "Word Count": "detailed recommendation",
            "wordsToAvoid": {
                "word1": "alternative",
                "word2": "alternative"
            }
        },
        "JScore": number,
        "GScore": number
    }

    Important:
    - Provide only the JSON response
    - Maintain exact key names as shown
    - Ensure all values are properly formatted
    - No additional explanations or text outside JSON structure`;

    console.log("Sending request to Azure OpenAI API...");
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      temperature: 0.1,
      max_tokens: 4000,
    });

    console.log("Received response from Azure OpenAI API");
    const { choices } = response;

    if (choices && choices[0]?.message?.content) {
      const rawContent = choices[0].message.content;
      console.log("Raw AI Response:", rawContent.substring(0, 200) + "...");

      const trimmedContent = extractRelevantJSON(rawContent);
      console.log("Trimmed JSON Content:", trimmedContent.substring(0, 200) + "...");

      try {
        const result = JSON.parse(trimmedContent);
        console.log("✅ Successfully parsed JSON response");
        return result;
      } catch (parseError) {
        console.error("❌ JSON Parse Error:", parseError.message);
        console.error("Failed content:", trimmedContent);

        // Return structured error response
        return createErrorResponse("JSON parsing failed", trimmedContent);
      }
    } else {
      console.log("No content in response");
      return createErrorResponse("No content in AI response");
    }
  } catch (error) {
    console.error("❌ Error in analyzeResume:", error.message);
    return createErrorResponse("AI service error", error.message);
  }
};

// Helper function to create error response
const createErrorResponse = (message, details = "") => {
  return {
    error: true,
    message: message,
    details: details,
    "Job Title Match": "Error",
    "Skills": {
      "TechnicalSkills": {},
      "SoftSkills": {}
    },
    "Suggested Skills": [],
    "Matched Projects And Internships": [],
    "Rephrased Projects And Internships": [],
    "Resume Improvement Suggestions": ["Please try again with a valid resume and job description"],
    "Grammatical Check": "Analysis failed",
    "Project Title Description Check": [],
    "Recruiter Tips": {
      "Suggestions": ["Please retry the analysis"],
      "Word Count": "Analysis failed",
      "wordsToAvoid": {}
    },
    "JScore": 0,
    "GScore": 0
  };
};

// Helper function to extract JSON data
const extractRelevantJSON = (content) => {
  try {
    console.log("Extracting JSON from response...");

    // Try to find JSON block markers
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonBlockMatch = content.match(jsonBlockRegex);

    if (jsonBlockMatch && jsonBlockMatch[1]) {
      console.log("Found JSON code block");
      return jsonBlockMatch[1].trim();
    }

    // Try to find JSON object directly
    const jsonRegex = /{[\s\S]*?}/;
    const jsonMatch = content.match(jsonRegex);

    if (jsonMatch) {
      console.log("Found JSON object directly");
      return jsonMatch[0];
    }

    // Try to find between specific markers
    const startMarker = '"Job Title Match"';
    const startIndex = content.indexOf(startMarker);

    if (startIndex !== -1) {
      console.log("Found start marker, extracting content...");
      const jsonPart = content.substring(startIndex - 1); // Include opening brace
      const endIndex = jsonPart.lastIndexOf('}');

      if (endIndex !== -1) {
        return jsonPart.substring(0, endIndex + 1);
      }

      return jsonPart + '}'; // Add closing brace if missing
    }

    console.log("No JSON structure found, creating fallback");
    return JSON.stringify(createErrorResponse("No JSON found in response"));

  } catch (error) {
    console.error("Error in extractRelevantJSON:", error);
    return JSON.stringify(createErrorResponse("JSON extraction failed"));
  }
};

module.exports = {
  analyzeResume,
};