import axios from "axios";

// Load environment variables
const LLMORPHEUS_LLM_API_ENDPOINT = process.env.OPENAI_API_ENDPOINT;
const LLMORPHEUS_LLM_AUTH_HEADERS = process.env.OPENAI_AUTH_HEADERS;

const headers = {
  ...JSON.parse(`${LLMORPHEUS_LLM_AUTH_HEADERS}`),
};
const postOptions = {
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
    {
      role: "user",
      content:
        "Please give a definition of the fibonacci function in TypeScript",
    },
  ],
  // provider: {
  //   order: ["Lepton"],
  // },
  max_tokens: 512,
  presence_penalty: 0,
  temperature: 0,
  top_p: 1,
};

async function makeRequest() {
  // console.log(`API endpoint: ${LLMORPHEUS_LLM_API_ENDPOINT}`);
  // console.log(`** API headers = ${JSON.stringify({ headers: headers })}`);
  // console.log(`** postOptions = ${JSON.stringify(postOptions)}`);

  const res = await axios.post(`${LLMORPHEUS_LLM_API_ENDPOINT}`, postOptions, {
    headers: headers,
  });
  console.log(res.data);
  // print response text
  const json = res.data;
  const completions = new Set<string>();
  for (const choice of json.choices) {
    const content = choice.message.content;
    console.log(content); // print completion
  }
}

makeRequest();
