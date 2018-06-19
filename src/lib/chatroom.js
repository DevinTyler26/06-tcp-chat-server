'use strict';

const EventEmitter = require('events');
const net = require('net');
const logger = require('./logger');
const User = require('./../model/user');

const PORT = process.env.PORT || 3000;

const server = net.createServer();
const event = new EventEmitter();
const clientPool = [];

server.listen(PORT, () => {
  logger.log(logger.INFO, `Server is running on PORT: ${PORT}`);
});

const parseData = (buffer) => {
  let text = buffer.toString().trim();
  if (!text.startsWith('@')) return null;
  // if (text.startsWith('@dm')) {
  //   text = text.split(' ');
  //   const [command] = text;
  //   const nickname = text.slice(1, 2).join('');
  //   const message = text.slice(2).join(' ');
  //   logger.log(logger.INFO, `This is the Command: ${command}`);
  //   logger.log(logger.INFO, `This is the Message: ${message}`);
  //   logger.log(logger.INFO, `This is the nickname: ${nickname}`);
  //   return {
  //     command,
  //     nickname,
  //     message,
  //   };
  // } 
  text = text.split(' ');
  const [command] = text;
  const message = text.slice(1).join(' ');
  logger.log(logger.INFO, `This is the Command: ${command}`);
  logger.log(logger.INFO, `This is the Message: ${message}`);
  return {
    command,
    message,
  };
};

const dispatchAction = (user, buffer) => {
  const entry = parseData(buffer);
  console.log('this is the entry: ', entry);
  if (entry) event.emit(entry.command, entry, user);
};

server.on('connection', (socket) => {
  const user = new User(socket);
  socket.write(`Welcome to the coolest chatroom, ${user.nickname}\n`);
  clientPool[user._id] = user;
  logger.log(logger.INFO, `A new user ${user.nickname} has joined the room`);

  socket.on('data', (buffer) => {
    dispatchAction(user, buffer);
  });
});

event.on('@all', (data, user) => {
  logger.log(logger.INFO, data);
  Object.keys(clientPool).forEach((userIdKey) => {
    const targetedUser = clientPool[userIdKey];
    targetedUser.socket.write(`>>${user.nickname}<<: ${data.message}\n`);
  });
});

event.on('@nickname', (data, user) => {
  logger.log(logger.INFO, data);
  clientPool[user._id].nickname = data.message;
  user.socket.write(`Your username is now ${data.message}\n`);
});

event.on('@list', (data, user) => {
  logger.log(logger.INFO, data);
  Object.keys(clientPool).forEach((userIdKey) => {
    user.socket.write(`${clientPool[userIdKey].nickname}\n`);
  });
});

event.on('@dm', (data, user) => {
  const nickname = data.message.split(' ').shift().trim();
  const message = data.message.split(' ').splice(1).join(' ').trim();
  console.log('message: ', message);  
  Object.keys(clientPool).forEach((userIdKey) => {
    if (clientPool[userIdKey].nickname === nickname) {
      const targetedUser = clientPool[userIdKey];
      targetedUser.socket.write(`${user.nickname}: ${message}\n`);
      user.socket.write(`>>${user.nickname}<<: ${message}\n`);      
    }
  });
});

function closeSocket(data, user) {
  const nickname = data.message.split(' ').shift().trim();  
  Object.keys(clientPool).forEach((userIdKey, i) => {
    if (clientPool[userIdKey].nickname === nickname) {
      const targetedUser = clientPool[userIdKey];
      clientPool.splice(targetedUser[i], 1);
      targetedUser.socket.end(`See Ya Later, >>${user.nickname}<<!\n`);
    }
  });
}

event.on('@quit', (data, user) => {
  closeSocket(data, user);
});
