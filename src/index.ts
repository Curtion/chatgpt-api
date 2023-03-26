import express from 'express';
import { expressjwt } from 'express-jwt';
import { ChatGPTAPI } from 'chatgpt'
import jwt from 'jsonwebtoken';
import * as uuid from 'uuid';
import bodyParser from 'body-parser';
// import { SocksProxyAgent } from 'socks-proxy-agent';
// import nodeFetch from 'node-fetch'
import cors from 'cors';
import config from '../config.js';
import { getClientIp } from './utils.js';
import session from './session.js';

// const agent = new SocksProxyAgent(config.socks5);

const api = new ChatGPTAPI({
  apiKey: config.apiKey,
  // fetch: ((url: any, options: any = {}) => {
  //   const defaultOptions = {
  //     agent
  //   };
  //   const mergedOptions = {
  //     ...defaultOptions,
  //     ...options
  //   };
  //   return nodeFetch(url, mergedOptions);
  // }) as any
})

const jwtMiddleware = expressjwt({
  secret: config.tokenSecret,
  algorithms: ['HS256']
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/send', jwtMiddleware, async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')
  try {
    const { id } = req.auth;
    let msg
    if (!session[id]) {
      msg = await api.sendMessage(req.body.msg, {
        onProgress: (partialResponse) => {
          res.write(partialResponse.delta ?? '')
        }
      })
      session[id] = {
        id: msg.id,
        replyDate: Date.now()
      }
    } else {
      msg = await api.sendMessage(req.body.msg, {
        parentMessageId: session[id].id,
        onProgress: (partialResponse) => res.write(partialResponse.delta ?? '')
      });
      session[id].replyDate = Date.now()
    }
    res.end()
  } catch (error) {
    res.json({
      message: error?.toString(),
      code: 500
    });
  }
});

app.delete('/del', jwtMiddleware, async (req, res) => {
  try {
    const { id } = req.auth;
    Reflect.deleteProperty(session, id);
    res.json({
      message: '清空会话成功!',
      code: 200
    });
  } catch (error) {
    res.json({
      message: error?.toString(),
      code: 500
    });
  }
});

app.post('/login', (req, res) => {
  const ip = getClientIp(req);
  const namespaceUuid = uuid.v5(ip, uuid.v5.URL);
  const token = jwt.sign({ id: namespaceUuid }, config.tokenSecret, { expiresIn: '30d', algorithm: 'HS256' });
  const user: user = {
    id: namespaceUuid,
    token,
  }
  res.json({
    ...user,
    code: 200,
  });
});

app.use((err: any, req: any, res: any, next: any) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: 'Unauthorized request',
      code: 401,
    });
  }
  next();
});

app.use((req, res) => {
  res.status(500).json({
    message: 'Internal Server Error',
    code: 500,
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});