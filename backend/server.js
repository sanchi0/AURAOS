const WebSocket = require('ws');
const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const { exec } = require('child_process');

// Check if Gemini API key is available
let model = null;
if (process.env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `You are AURA, a powerful local OS AI assistant. You have the ability to execute bash commands on the user's Linux machine.
If the user's request requires executing a system command (e.g., creating a folder, downloading a file, opening an application, etc.), respond ONLY with a JSON object in this exact format: {"command": "your bash command"}. Do not include any other text or markdown formatting.
If the request is conversational and does NOT require executing a command, respond normally with natural text.`
  });
  console.log('✅ Gemini AI initialized');
} else {
  console.log('⚠️ No Gemini API key found. Using fallback responses.');
}

wss.on('connection', (ws) => {
  console.log('✅ Client connected to AURA backend');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'prompt') {
        const userPrompt = message.content;

        if (model) {
          // Use Gemini AI
          try {
            const result = await model.generateContentStream(userPrompt);
            let fullResponse = '';
            let isJSONCommand = false;

            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                fullResponse += chunkText;

                if (fullResponse.trimStart().startsWith('{')) {
                  isJSONCommand = true;
                  continue;
                }

                if (!isJSONCommand) {
                  ws.send(JSON.stringify({ type: 'stream', content: chunkText }));
                }
              }
            }

            if (isJSONCommand) {
              try {
                const cleanedStr = fullResponse.replace(/^```(?:json)?|```$/gm, '').trim();
                const parsed = JSON.parse(cleanedStr);

                if (parsed.command) {
                  ws.send(JSON.stringify({ type: 'response', content: `> Executing: ${parsed.command}\n\n` }));

                  const child = exec(parsed.command, { cwd: '/home/vboxuser' });

                  child.stdout.on('data', (data) => {
                    ws.send(JSON.stringify({ type: 'stream', content: data.toString() }));
                  });

                  child.stderr.on('data', (data) => {
                    ws.send(JSON.stringify({ type: 'stream', content: data.toString() }));
                  });

                  child.on('close', (code) => {
                    ws.send(JSON.stringify({ type: 'stream_end' }));
                    const statusMsg = code === 0 ? '\n✅ Command completed successfully.' : `\n❌ Command failed with exit code ${code}.`;
                    ws.send(JSON.stringify({ type: 'response', content: statusMsg }));
                  });
                  return;
                }
              } catch (e) {
                console.error("JSON parse failed for command:", e);
                ws.send(JSON.stringify({ type: 'response', content: fullResponse }));
              }
            }

            if (!isJSONCommand) {
              ws.send(JSON.stringify({ type: 'stream_end' }));
            }

          } catch (apiError) {
            console.error('Gemini API error:', apiError);
            ws.send(JSON.stringify({ type: 'response', content: `Error: ${apiError.message}` }));
          }
        } else {
          // Use fallback responses
          const lowerPrompt = userPrompt.toLowerCase();
          let response = '';

          if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
            response = "Hello! I am AURA, your personal assistant. How can I help you today?";
          } else if (lowerPrompt.includes('time')) {
            response = `The current time is ${new Date().toLocaleTimeString()}.`;
          } else if (lowerPrompt.includes('date')) {
            response = `Today is ${new Date().toLocaleDateString()}.`;
          } else {
            response = `I received: "${userPrompt}". To use full AI capabilities, please add your Gemini API key to the .env file.`;
          }

          ws.send(JSON.stringify({ type: 'response', content: response }));
        }
      }

    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ type: 'error', content: error.message }));
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 AURA WebSocket server running on port ${PORT}`);
});