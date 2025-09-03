const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const server = new WebSocket.Server({ port: 8081 });

let connectedClients = 0;
const clients = new Map();
const messagesFilePath = path.join(__dirname, 'messages.json');

// Leer mensajes de archivo
function loadMessages(port) {
    if (fs.existsSync(messagesFilePath)) {
        const messagesData = fs.readFileSync(messagesFilePath);
        const allMessages = JSON.parse(messagesData);
        return allMessages[port] || [];
    }
    return [];
}

// Guardar mensajes en archivo
function saveMessage(port, message) {
    let allMessages = {};
    if (fs.existsSync(messagesFilePath)) {
        const messagesData = fs.readFileSync(messagesFilePath);
        allMessages = JSON.parse(messagesData);
    }
    if (!allMessages[port]) {
        allMessages[port] = [];
    }
    allMessages[port].push(message);
    fs.writeFileSync(messagesFilePath, JSON.stringify(allMessages, null, 2));
}

server.on('connection', (socket) => {
    console.log('Cliente conectado');
    connectedClients++;

    socket.on('message', (data) => {
        const message = JSON.parse(data);

        if (message.type === 'init') {
            // Primer mensaje del cliente es su nombre de usuario y el puerto
            const { userName, port } = message;
            clients.set(socket, { userName, port });

            // Enviar mensajes anteriores al cliente
            const previousMessages = loadMessages(port);
            previousMessages.forEach(msg => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify(msg));
                }
            });

            broadcastConnectedClients(port);
        } else {
            // Envía el mensaje a todos los clientes conectados con el nombre de usuario
            const clientInfo = clients.get(socket);
            const fullMessage = { userName: clientInfo.userName, message: message.text };
            saveMessage(clientInfo.port, fullMessage);
            server.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN && clients.get(client).port === clientInfo.port) {
                    client.send(JSON.stringify(fullMessage));
                }
            });
        }
    });

    socket.on('close', () => {
        console.log('Cliente desconectado');
        connectedClients--;
        const clientInfo = clients.get(socket);
        if (clientInfo) {
            broadcastConnectedClients(clientInfo.port);
            clients.delete(socket);
        }
    });
});

function broadcastConnectedClients(port) {
    const message = `Usuarios conectados: ${connectedClients}`;
    server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && clients.get(client).port === port) {
            client.send(message);
        }
    });
}

console.log('Servidor de sala de chat funcionando en el puerto8081');