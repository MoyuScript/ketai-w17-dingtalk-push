import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { APP_ID } from './constants.js';
import { parseRaw } from './util.js'

export class KetaiWebsocket extends EventEmitter {
  constructor({ uid, token, dataPoint }) {
    super();
    this.uid = uid;
    this.token = token;
    this._ws = null;
    this._heartBeatId = null;
    this.dataPoint = dataPoint;
  }

  connect(url) {
    return new Promise((r) => {
      this._ws = new WebSocket(url);

      this._ws.on('open', async () => {
        await this._login();
        r();
      });

      this._ws.on('message', (data) => {
        const res = JSON.parse(data);
        this.emit(res.cmd, res.data);
        console.log(res);
      });
    })
  }

  disconnect() {
    this._stopHeartbeat();
    this._ws.close();
    this._ws = null;
  }

  subscribeDevice(did, callback) {
    this._ws.send(JSON.stringify({
      cmd: 'subscribe_req',
      data: [
        {
          did
        }
      ]
    }));

    this.once('subscribe_res', ({ success, failed }) => {
      const fail = failed.find((v) => v.did === did);
      if (fail) {
        console.error(`订阅 ${did} 失败：${fail.msg}`);
        callback(new Error(`订阅 ${did} 失败：${fail.msg}`))
        return;
      }

      this.on('s2c_raw', async (data) => {
        if (data.did === did) {
          callback({
            type: 'push',
            data: parseRaw(data.raw, this.dataPoint)
          });
        }
      })

      this.on('s2c_online_status', (data) => {
        if (data.did === did) {
          callback({
            type: 'online',
            data
          });
        }
      })
      console.log(`订阅 ${did} 成功`);
    })
  }

  _login() {
    return new Promise((r) => {
      this._ws.send(JSON.stringify({
        cmd: 'login_req',
        data: {
          appid: APP_ID,
          uid: this.uid,
          token: this.token,
          p0_type: 'custom',
          heartbeat_interval: 35,
          auto_subscribe: false
        }
      }));
  
      this.once('login_res', ({ success }) => {
        if (!success) {
          this._ws.close();
          throw new Error('Websocket 登录失败。');
        }
        console.log('Websocket 登录成功。');
        this._startHeartbeat();
        r();
      })
    })
  }

  _startHeartbeat() {
    if (!this._heartBeatId) {
      const heartbeat = () => {
        this._ws.send(JSON.stringify({
          cmd: 'ping'
        }));

        const id = setTimeout(() => {
          console.warn('Ping 超时未响应，重连');
          this.disconnect();
          this.connect();
        }, 10 * 1000);

        this.once('pong', () => {
          clearTimeout(id);
          this._heartBeatId = setTimeout(heartbeat, 30 * 1000);
        });
      }

      heartbeat();
    }
  }

  _stopHeartbeat() {
    if (this._heartBeatId) {
      clearTimeout(this._heartBeatId);
    }
  }
}