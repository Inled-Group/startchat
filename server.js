const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

const httpServer = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm',
        '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                fs.readFile('./404.html', (error, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const wss = new WebSocket.Server({ server: httpServer });

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

wss.on('connection', (socket) => {
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
            wss.clients.forEach((client) => {
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
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && clients.get(client).port === port) {
            client.send(message);
        }
    });
}

httpServer.listen(8080, () => {
    console.log('Sirviendo el sitio web y el primer servidor de chat desde http://localhost:8080');
});
