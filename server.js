const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (socket) => {
    socket.on('message', (message) => {
        // Envía el mensaje a todos los clientes conectados
        server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});

console.log('Servidor WebSocket en funcionamiento en ws://localhost:8080 ');
