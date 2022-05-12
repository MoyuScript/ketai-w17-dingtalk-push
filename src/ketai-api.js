import got from 'got';
import { APP_ID } from './constants.js';

/**
 * 柯泰报警器使用 [机智云 API](http://docs.gizwits.com/zh-cn/Cloud/openapi_apps.html)
 */
export class KetaiApi {
  constructor() {
    this._got = null;
    this._initGot();
    this.loginInfo = null;
  }

  _initGot() {
    this._got = got.extend({
      headers: {
        'X-Gizwits-Application-Id': APP_ID,
        'X-Gizwits-User-token': this.loginInfo?.token
      },
    })
  }

  async login(username, password) {
    const res = await this._got.post('https://api.gizwits.com/app/login', {
      json: {
        username,
        password,
      }
    }).json();
    this.loginInfo = res;
    this._initGot();
  }

  async getBindingDevices(params) {
    return this._got.get('https://api.gizwits.com/app/bindings', {
      searchParams: params
    }).json();
  }

  async getDeviceState(did) {
    return this._got.get(`https://api.gizwits.com/app/devdata/${did}/latest`).json();
  }

  async sendData(did, payload) {
    return this._got.post(`https://api.gizwits.com/app/control/${did}`, {
      json: payload
    }).json()
  }

  async getDataPoint(product_key) {
    return this._got.get(`https://api.gizwits.com/app/datapoint?product_key=${product_key}`).json();
  }
}