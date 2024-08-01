const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8081 });

// Almacenar la dirección IP de cada cliente
const clientIPs = new Map();

server.on('connection', (socket, req) => {
    console.log('Cliente conectado:', req.socket.remoteAddress);
    // Obtener la dirección IP del cliente
    const clientIP = req.socket.remoteAddress;

    // Almacenar la dirección IP del cliente
    clientIPs.set(socket, clientIP);

    socket.on('message', (message) => {
        console.log('Mensaje recibido:', message);
    
        server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                const clientAddress = clientIPs.get(client);
                console.log('Enviando mensaje a:', clientAddress);
                client.send(`[${clientAddress}] ${message}`);
            }
        });
    });
    
    socket.on('close', () => {
        // Eliminar la dirección IP del cliente cuando se desconecte
        clientIPs.delete(socket);
    });
});

console.log('Servidor WebSocket en funcionamiento en ws://localhost:8081');
