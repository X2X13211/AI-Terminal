const readline = require('readline');
const https = require('https');
const storage = require('node-persist');

async function initStorage() {
    await storage.init({
        dir: './chat-storage',
        stringify: JSON.stringify,
        parse: JSON.parse,
        encoding: 'utf8',
        logging: false
    });
}

let currentModel = 'deepseek-r1';
let chatHistory = [];
let currentChatId = 'default';
let chatCounter = 1;
const config = require('./config');
const API_KEY = config.getAPIKey();
const BASE_URL = config.getBaseURL();


function makeRequest(userMessage) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: currentModel,
            messages: [{ role: "user", content: userMessage }],
            max_tokens: 5000
        });
        
        const options = {
            hostname: BASE_URL,
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 30000
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
                        resolve(parsed.choices[0].message.content);
                    } else {
                        reject(new Error('Invalid response format from API'));
                    }
                } catch (error) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.write(postData);
        req.end();
    });
}

async function sendToAPI(userMessage) {
    try {
        return await makeRequest(userMessage);
    } catch (error) {
        console.log('Error API:', error.message);
        return `Error: ${error.message}`;
    }
}

async function saveChat() {
    try {
        const chatData = {
            history: chatHistory,
            model: currentModel,
            timestamp: new Date().toISOString(),
            name: currentChatId
        };
        await storage.setItem(`chat_${currentChatId}`, chatData);
        await storage.setItem('currentChatId', currentChatId);
        await storage.setItem('chatCounter', chatCounter);
        
        const chatList = await storage.getItem('chatList') || [];
        if (!chatList.includes(currentChatId)) {
            chatList.push(currentChatId);
            await storage.setItem('chatList', chatList);
        }
    } catch (error) {
        console.log('Error saving chat:', error.message);
    }
}

async function loadChat(chatId = null) {
    try {
        const chatIdToLoad = chatId || currentChatId;
        const chatData = await storage.getItem(`chat_${chatIdToLoad}`);
        
        if (chatData) {
            chatHistory = chatData.history || [];
            currentModel = chatData.model || 'deepseek-r1';
            currentChatId = chatIdToLoad;
            return true;
        }
        return false;
    } catch (error) {
        console.log('Error loading chat:', error.message);
        return false;
    }
}

async function listChats() {
    try {
        const chatList = await storage.getItem('chatList') || [];
        return chatList;
    } catch (error) {
        console.log('Error listing chats:', error.message);
        return [];
    }
}

async function getChatName(chatId) {
    try {
        const chatData = await storage.getItem(`chat_${chatId}`);
        return chatData ? chatData.name : chatId;
    } catch (error) {
        return chatId;
    }
}

async function createNewChat() {
    const savedCounter = await storage.getItem('chatCounter');
    chatCounter = savedCounter ? savedCounter + 1 : 1;
    
    currentChatId = `chat_${chatCounter}`;
    const chatName = `New Chat ${chatCounter}`;
    chatHistory = [];
    
    await saveChat();
    return { id: currentChatId, name: chatName };
}

async function renameChat(chatId, newName) {
    try {
        const chatData = await storage.getItem(`chat_${chatId}`);
        if (chatData) {
            chatData.name = newName;
            await storage.setItem(`chat_${chatId}`, chatData);
            
            if (chatId === currentChatId) {
                currentChatId = newName;
            }
            return true;
        }
        return false;
    } catch (error) {
        console.log('Error renaming chat:', error.message);
        return false;
    }
}

async function switchChat(chatId) {
    const success = await loadChat(chatId);
    if (success) {
        await saveChat();
    }
    return success;
}

function showHelp() {
    console.log("");
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║               === COMMANDS ===               ║");
    console.log("╚══════════════════════════════════════════════╝");

    console.log("/help - available commands");
    console.log("/clear - clear current chat");
    console.log("/model - change model");
    console.log("/chats - list all chats");
    console.log("/new - create new chat");
    console.log("/switch name - switch to chat by name");
    console.log("/rename new_name - rename current chat");
    console.log("/exit - exit program");
    console.log("\n");
}

function showModelMenu() {
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║              === SELECT MODEL ===            ║");
    console.log("╚══════════════════════════════════════════════╝");
    
    for (let i = 1; i <= 10; i++) {
        switch(i) {
            case 1:
                console.log("1. DeepSeek");
                break;
            case 2:
                console.log("2. GPT-5-Nano");
                break;
            case 3:
                console.log("3. GPT-5-Mini");
                break;
            case 4:
                console.log("4. GPT-4.1-Nano");
                break;
            case 5:
                console.log("5. Qwen3-Coder");
                break;
            case 6:
                console.log("6. Gemini-2.5");
                break;
            case 7:
                console.log("7. Qwen-3-30b");
                break;
            case 8:
                console.log("8. Qwen-3-235b");
                break;
            case 9:
                console.log("9. Grok-4");
                break;
            case 10:
                console.log("10. Grok-Code");
                break;
        }
    }
    console.log("\n────────────────────────────────────────────────\n");
}

function selectModel(choice) {
    if (choice === 1) {
        return "deepseek-r1";
    } else if (choice === 2) {
        return "gpt-5-nano";
    } else if (choice === 3) {
        return "gpt-5-mini";
    } else if (choice === 4) {
        return "gpt-4.1-nano";
    } else if (choice === 5) {
        return "qwen3-coder-30b-a3b-instruct";
    } else if (choice === 6) {
        return "gemini-2.5-flash-lite"; 
    } else if (choice === 7) {
        return "qwen3-30b-a3b";
    } else if (choice === 8) {
        return "qwen3-235b-a22b-2507"; 
    } else if (choice === 9) {
        return "grok-4-fast"; 
    } else if (choice === 10) {
        return "grok-code-fast-1"; 
    } else {
        return "deepseek-r1";
    }
}

function clearScreen(count) {
    if (count <= 0) return; 
    console.log("");
    clearScreen(count - 1); 
}

async function showChatsList() {
    const chats = await listChats();
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║                === CHATS ===                 ║");
    console.log("╚══════════════════════════════════════════════╝\n");
    
    if (chats.length === 0) {
        console.log("No chats found");
    } else {
        for (let i = 0; i < chats.length; i++) {
            const chatId = chats[i];
            const chatName = await getChatName(chatId);
            const marker = chatId === currentChatId ? "[CURRENT]" : "";
            console.log(`${i + 1}. ${chatName} ${marker}`);
        }
    }
    console.log("\nUse '/switch name' to switch to a chat");
    console.log("Use '/rename new_name' to rename current chat");
    console.log("────────────────────────────────────────────────\n");
}

async function chatLoop(rl) {
    const currentChatName = await getChatName(currentChatId);
    console.log(`\nCurrent chat: ${currentChatName}`);
    console.log("Enter your request or /help to view the available commands.\n");

    let userInput;
    do {
        userInput = await new Promise((resolve) => {
            rl.question('>>> ', resolve);
        });

        if (userInput === '/help') {
            showHelp();
        } 
        else if (userInput === '/clear') {
            clearScreen(50);
            chatHistory = [];
            await saveChat();
            console.log("The chat has been cleared!");
        } 
        else if (userInput === '/model') {
            showModelMenu();
            const modelChoice = await new Promise((resolve) => {
                rl.question('Select model (1-10): ', resolve);
            });
            currentModel = selectModel(parseInt(modelChoice));
            await saveChat();
            console.log(`The model has been changed to: ${currentModel}`);
        }
        else if (userInput === '/chats') {
            await showChatsList();
        }
        else if (userInput === '/new') {
            const newChat = await createNewChat();
            console.log(`New chat created: ${newChat.name}`);
            console.log(`Switched to chat: ${newChat.name}`);
        }
        else if (userInput.startsWith('/switch ')) {
            const targetName = userInput.split(' ').slice(1).join(' ');
            if (targetName) {
                const chats = await listChats();
                let foundChat = null;
                
                for (const chatId of chats) {
                    const chatName = await getChatName(chatId);
                    if (chatName === targetName) {
                        foundChat = chatId;
                        break;
                    }
                }
                
                if (foundChat) {
                    const success = await switchChat(foundChat);
                    if (success) {
                        const newChatName = await getChatName(foundChat);
                        console.log(`Switched to chat: ${newChatName}`);
                    }
                } else {
                    console.log(`Chat not found: ${targetName}`);
                }
            } else {
                console.log("Please specify chat name: /switch chat_name");
            }
        }
        else if (userInput.startsWith('/rename ')) {
            const newName = userInput.split(' ').slice(1).join(' ');
            if (newName) {
                const success = await renameChat(currentChatId, newName);
                if (success) {
                    console.log(`Chat renamed to: ${newName}`);
                    currentChatId = newName;
                    await saveChat();
                } else {
                    console.log("Error renaming chat");
                }
            } else {
                console.log("Please specify new name: /rename new_name");
            }
        }
        else if (userInput === '/exit') {
            console.log("Exiting the program...");
            break;
        } 
        else if (userInput.trim() !== '') {
            console.log();

            for (let i = 0; i < 3; i++) {
                process.stdout.write(".");
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            console.log("\n");

            const aiResponse = await sendToAPI(userInput);
            console.log(`${aiResponse}\n`);

            chatHistory.push(`You: ${userInput}`);
            chatHistory.push(`AI: ${aiResponse}`);
            await saveChat();
        } else {
            console.log("Enter a message or command");
        }

    } while (userInput !== '/exit');
}

async function main() {
    await initStorage();
    
    const savedCounter = await storage.getItem('chatCounter');
    if (savedCounter) {
        chatCounter = savedCounter;
    }
    
    const hasSavedChat = await loadChat();
    if (hasSavedChat) {
        console.log("Previous chat loaded");
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    showHelp();

    showModelMenu();

    let validChoice = false;
    
    while (!validChoice) {
        const choice = await new Promise((resolve) => {
            rl.question('Select a model (1-10): ', resolve);
        });

        const choiceNumber = parseInt(choice);
        
        if (choiceNumber >= 1 && choiceNumber <= 10) {
            validChoice = true;
            currentModel = selectModel(choiceNumber);
            await saveChat();
            console.log(`The model is selected: ${currentModel}\n`);
        } else {
            console.log("Wrong choice! Try again.");
        }
    }

    await chatLoop(rl);

    rl.close();
    console.log("Thanks for using!");
}

main().catch(console.error);