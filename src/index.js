import dotenv from 'dotenv'
import { KetaiApi } from './ketai-api.js'
import { KetaiWebsocket } from './ketai-websocket.js';
import { send } from 'super-dingbot'

dotenv.config();
const env = process.env;

const ketaiApi = new KetaiApi();
await ketaiApi.login(env.KETAI_ACCOUNT, env.KETAI_PASSWORD);

const devices = await ketaiApi.getBindingDevices();
const device = devices.devices.find((v) => v.mac === env.KETAI_DEVICE_MAC.toLowerCase());

if (!device) {
  throw new Error(`找不到设备：${env.KETAI_DEVICE_MAC}`);
}

const ketaiWs = new KetaiWebsocket({
  uid: ketaiApi.loginInfo.uid, 
  token: ketaiApi.loginInfo.token,
  dataPoint: await ketaiApi.getDataPoint(device.product_key),
});

await ketaiWs.connect(`wss://${device.host}:${device.wss_port}/ws/app/v1`);

ketaiWs.subscribeDevice(device.did, (data) => {
  if (data instanceof Error) {
    throw data;
  }

  console.log(data);

  if (data.type === 'push' && data.data.PushFlag) {
    // 报警
    const text = Buffer.from(data.data.PushText).toString('utf-8');
    send({
      accessToken: env.DING_TOKEN,
      secret: env.DING_SECRET,
      type: 'markdown',
      payload: {
        title: '❗安防报警',
        text: `# ❗安防报警\n\n${text}`
      }
    })
  } else if (data.type === 'online') {
    const text = data.data.online ? '✅安防设备上线' : '❌安防设备离线';
    send({
      accessToken: env.DING_TOKEN,
      secret: env.DING_SECRET,
      type: 'markdown',
      payload: {
        title: text,
        text: `# ${text}\n\nMAC: ${data.data.mac}`
      }
    });
  }
})
