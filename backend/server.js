const WebSocket = require('ws');
const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const { exec } = require('child_process');


const apiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

if (apiKeys.length > 0) {
  console.log(`✅ Gemini AI initialized with ${apiKeys.length} API keys.`);
} else {
  console.log('⚠️ No Gemini API key found. Using fallback responses.');
}

async function generateContentWithRetry(promptData) {
  let attempts = 0;
  while (attempts < apiKeys.length) {
    const key = apiKeys[currentKeyIndex];
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are AURA, a powerful local OS AI assistant. You have the ability to execute bash commands on the user's Linux machine.
If the user's request requires executing a system command (e.g., creating a folder, downloading a file, opening an application, etc.), respond ONLY with a JSON object in this exact format: {"command": "your bash command"}. Do not include any other text or markdown formatting.
If the request is conversational and does NOT require executing a command, respond normally with natural text.`
    });

    try {
      return await model.generateContentStream(promptData);
    } catch (error) {
      console.warn(`⚠️ API Key ${currentKeyIndex + 1} failed (${error.message}). Switching to next key...`);
      currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
      attempts++;
    }
  }
  throw new Error('All Gemini API keys failed or limit reached.');
}

wss.on('connection', (ws) => {
  console.log('✅ Client connected to AURA backend');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'execute') {
        const cmd = message.content;
        if (cmd.includes('sudo ') || cmd.startsWith('sudo')) {
          ws.send(JSON.stringify({ type: 'require_password', command: cmd }));
          return;
        }
        ws.send(JSON.stringify({ type: 'stream', content: `> Executing: ${cmd}\n\n` }));
        const child = exec(cmd, { cwd: '/home/vboxuser' });

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
      } else if (message.type === 'execute_sudo') {
        const cmd = message.command;
        const pwdEscaped = message.password.replace(/"/g, '\\"');
        ws.send(JSON.stringify({ type: 'stream', content: `> Executing with sudo: ${cmd}\n\n` }));
        const sudoCmd = cmd.replace(/(^|\s)sudo\s+/g, `$1echo "${pwdEscaped}" | sudo -S `);
        const child = exec(sudoCmd, { cwd: '/home/vboxuser' });

        child.stdout.on('data', (data) => ws.send(JSON.stringify({ type: 'stream', content: data.toString() })));
        child.stderr.on('data', (data) => ws.send(JSON.stringify({ type: 'stream', content: data.toString() })));
        child.on('close', (code) => {
          ws.send(JSON.stringify({ type: 'stream_end' }));
          const statusMsg = code === 0 ? '\n✅ Command completed successfully.' : `\n❌ Command failed with exit code ${code}.`;
          ws.send(JSON.stringify({ type: 'response', content: statusMsg }));
        });
      } else if (message.type === 'prompt') {
        const userPrompt = message.content;

        if (apiKeys.length > 0) {
          
          try {
            let promptData = userPrompt;
            const lowerPrompt = userPrompt.toLowerCase();
            if (lowerPrompt.includes('see') || lowerPrompt.includes('screen') || lowerPrompt.includes('document') || lowerPrompt.includes('look') || lowerPrompt.includes('read')) {
               ws.send(JSON.stringify({ type: 'stream', content: `> Capturing screen...\n\n` }));
               const execPromise = require('util').promisify(exec);
               try {
                 await execPromise('gnome-screenshot -f /tmp/aura_screen.png');
                 const imgData = require('fs').readFileSync('/tmp/aura_screen.png');
                 const base64Img = imgData.toString('base64');
                 promptData = [
                   { inlineData: { data: base64Img, mimeType: 'image/png' } },
                   userPrompt
                 ];
               } catch (e) {
                 console.error('Screenshot failed:', e);
                 ws.send(JSON.stringify({ type: 'stream', content: `> Screenshot failed: ${e.message}\n\n` }));
               }
            }
            const result = await generateContentWithRetry(promptData);
            let fullResponse = '';
            let isJSONCommand = false;

            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              if (chunkText) {
                fullResponse += chunkText;

                if (fullResponse.trimStart().startsWith('{') || fullResponse.trimStart().startsWith('`')) {
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
                  if (parsed.command.includes('sudo ') || parsed.command.startsWith('sudo')) {
                    ws.send(JSON.stringify({ type: 'require_password', command: parsed.command }));
                    return;
                  }

                  ws.send(JSON.stringify({ type: 'stream', content: `> Executing: ${parsed.command}\n\n` }));

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
      } else if (message.type === 'system_control') {
        const action = message.action;
        try {
          const execPromise = require('util').promisify(exec);
          if (action === 'get_networks') {
            const { stdout } = await execPromise('nmcli -t -f SSID,SIGNAL,ACTIVE,SECURITY dev wifi');
            const networks = stdout.split('\n').filter(Boolean).map(line => {
              const [ssid, signal, active, sec] = line.split(':');
              return { ssid, signal: parseInt(signal), active: active === 'yes', sec };
            }).filter(n => n.ssid);
            ws.send(JSON.stringify({ type: 'network_list', networks }));
          } else if (action === 'connect_network') {
            const cmd = message.password ? `nmcli dev wifi connect "${message.ssid}" password "${message.password}"` : `nmcli dev wifi connect "${message.ssid}"`;
            await execPromise(cmd);
            ws.send(JSON.stringify({ type: 'response', content: `Connected to ${message.ssid}` }));
          } else if (action === 'get_bluetooth') {
             const { stdout } = await execPromise('bluetoothctl devices');
             const devices = stdout.split('\n').filter(Boolean).map(l => {
                const parts = l.split(' ');
                return { mac: parts[1], name: parts.slice(2).join(' ') };
             });
             ws.send(JSON.stringify({ type: 'bluetooth_list', devices }));
          } else if (action === 'connect_bluetooth') {
             await execPromise(`bluetoothctl connect ${message.mac}`);
             ws.send(JSON.stringify({ type: 'response', content: `Connected to Bluetooth device` }));
          } else if (action === 'get_displays') {
             const { stdout } = await execPromise('xrandr --query');
             ws.send(JSON.stringify({ type: 'display_info', raw: stdout }));
          } else if (action === 'set_brightness') {
             await execPromise(`xrandr --output ${message.display} --brightness ${message.value}`);
             ws.send(JSON.stringify({ type: 'response', content: `Brightness set to ${message.value}` }));
          } else if (action === 'set_volume') {
             await execPromise(`amixer -D pulse sset Master ${message.value}%`);
             ws.send(JSON.stringify({ type: 'response', content: `Volume set to ${message.value}%` }));
          }
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', content: e.message }));
        }
      } else if (message.type === 'file_explore') {
        const targetPath = message.path || '/home/vboxuser/Desktop';
        try {
          const fs = require('fs');
          const p = require('path');
          const items = await fs.promises.readdir(targetPath);
          const detailedItems = [];
          for (const item of items) {
             const fullPath = p.join(targetPath, item);
             const stat = await fs.promises.stat(fullPath).catch(()=>null);
             if (stat) {
                detailedItems.push({
                   name: item,
                   path: fullPath,
                   isDir: stat.isDirectory(),
                   size: stat.size,
                   mtime: stat.mtime
                });
             }
          }
          ws.send(JSON.stringify({ type: 'explore_results', path: targetPath, items: detailedItems }));
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', content: e.message }));
        }
      } else if (message.type === 'file_op') {
         const action = message.action;
         const fs = require('fs');
         try {
            if (action === 'delete') {
               await fs.promises.rm(message.target, { recursive: true, force: true });
               ws.send(JSON.stringify({ type: 'response', content: `Deleted ${message.target}` }));
            } else if (action === 'copy') {
               await fs.promises.cp(message.src, message.dest, { recursive: true });
               ws.send(JSON.stringify({ type: 'response', content: `Copied to ${message.dest}` }));
            } else if (action === 'move') {
               await fs.promises.rename(message.src, message.dest);
               ws.send(JSON.stringify({ type: 'response', content: `Moved to ${message.dest}` }));
            }
            ws.send(JSON.stringify({ type: 'file_op_success', action, target: message.target || message.dest }));
         } catch(e) {
            ws.send(JSON.stringify({ type: 'error', content: e.message }));
         }
      }

    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ type: 'error', content: error.message }));
    }
  });
});



const os = require('os');
const fs = require('fs');
const path = require('path');

function getDesktopFiles() {
  try {
    const desktopPath = '/home/vboxuser/Desktop';
    if (!fs.existsSync(desktopPath)) return [];
    return fs.readdirSync(desktopPath).map(f => {
      const stats = fs.statSync(path.join(desktopPath, f));
      return { 
        name: f, 
        isDir: stats.isDirectory(), 
        isExec: f.endsWith('.desktop') || !!(stats.mode & fs.constants.S_IXUSR) 
      };
    });
  } catch (e) {
    return [];
  }
}

setInterval(() => {
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const memUsedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const loadAvg = os.loadavg()[0].toFixed(2);
  
  const sysinfo = JSON.stringify({
    type: 'sysinfo',
    memUsed: memUsedPercent,
    cpuLoad: loadAvg,
    desktopFiles: getDesktopFiles()
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(sysinfo);
    }
  });
}, 2000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 AURA WebSocket server running on port ${PORT}`);
});