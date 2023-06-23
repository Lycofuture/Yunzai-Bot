/*
 * @Author: Lycofuture 
 * @Date: 2023-05-02 16:10:00 
 * @Last Modified by: Lycofuture
 * @Last Modified time: 2023-06-23 19:47:51
 * 群聊使用触发指令为“//”
 * 首次使用可能会有盾，请自己想办法过盾
 * 增加随机cd防止频繁访问导致触发盾
 * 增加gpt的api，分离参数，增加判断
 * 修复cd判断错误的问题
 * 增加api接口,接口设置
 * 修复data数据报错问题
 * 隐藏日志，较低优先级
 * 数据格式化分离储存
 * 修复回复为空的问题     
 */
if (!global.segment) {
  try {
      global.segment = (await
          import("icqq")).segment
  } catch {
      global.segment = (await
          import("oicq")).segment
  }
}
import plugin from "../../lib/plugins/plugin.js";
import fetch from "node-fetch";
import fs from "fs";
let pathToDir = `${process.cwd()}/data/example`;
if (!fs.existsSync(pathToDir)) {
  // 如果目录不存在，则创建它
  fs.mkdirSync(pathToDir, {
      recursive: true
  });
}
const pathgpt = `${pathToDir}/ChatGPT.json`;
if (!fs.existsSync(pathgpt)) {
  // 如果文件不存在，则创建它并初始化值
  fs.writeFileSync(pathgpt, JSON.stringify({
      school: 0
  }));
}
let jsonData = fs.readFileSync(pathgpt, 'utf-8');
let data = JSON.parse(jsonData)
const COOLDOWN_TIME = Math.floor(Math.random() * 1000) + 1000;
export class GPTAI extends plugin {
  constructor() {
      super({
          name: 'gpt3.5',
          dsc: 'chatgpt',
          event: 'message',
          priority: 500000,
          rule: [{
              reg: /^#?gpt(接口|密钥)设置(.*)?$/,
              fnc: 'setkey'
          }, {
              reg: /.*/g,
              fnc: 'gpt',
              log: false
          }]
      })
  }
  async setkey(e) {
      let msg = this.e.msg;
      console.log(msg)
      if (/密钥/.test(msg)) {
          let esc = msg.replace(/#gpt密钥设置/g, '');
          if (parseInt(data[e.user_id].num) === 2) {
              data[e.user_id].a20key = esc;
              e.reply(`密钥设置成功`)
          } else {
              e.reply(`当前接口为${data[e.user_id].num},不需要设置密钥`)
          }
          return true
      } else if (/接口/.test(msg)) {
          let esc = msg.replace(/#?gpt接口设置/g, '');
          console.log(esc);
          if (esc < 0 || esc > 3) {
              e.reply(`接口设置错误`)
          } else if (!esc) {
              e.reply(`示例：#gpt设置接口0\n接口有:\n0.GPT-3.5-Turbo模型\n1.ChatGPT-3.5连续对话模型\n2.ChatGPT3.5，支持连续对话，支持多对话(需要key，非官方)\n3.ChatGPT-3.5连续对话模型`)
          } else {
              data[e.user_id].num = esc;
              e.reply(`接口设置为${esc}成功`)
          }
      }
      jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(pathgpt, jsonData, 'utf8');
  }
  async gpt(e) {
      let msg = this.e.msg;
      if (this.e.isGroup) {
          let hasBlankMessage = this.e.atme && this.e.msg;
          if (hasBlankMessage || /\//.test(msg)) {
              await this.scgpt(e);
          }
      } else {
          await this.scgpt(e);
      }
      return false;
  }
  async scgpt(e) {
      if (!data[e.user_id]) {
          data[e.user_id] = {};
      }
      if (data[e.user_id].num === undefined) {
          data[e.user_id].num = 0;
          e.reply("未设置接口，初始化接口为0。可发送'gpt接口设置'更换接口")
      }
      if (isCooldown(e.user_id)) {
          let remainingTimeInSeconds = Math.ceil((COOLDOWN_TIME - (Date.now() - data[e.user_id].updatedAt)) / 1000);
          await e.reply(`请稍等${remainingTimeInSeconds}秒后再试。`);
          return;
      }
      if (parseInt(data[e.user_id].num) === 2 && (!data[e.user_id].a20key)) {
          e.reply(`当前接口为${data[e.user_id].num}，需要设置key才能使用(不是官方key)`)
          return true;
      }
      let start = process.hrtime();
      let txt = e.msg;
      let msg = txt.replace(/\/\//,'')
      console.log(`处理消息${msg}`)
      e.reply("正在思考您发送的内容...")
      //请求地址
      const urls = [
          'https://api.pearktrue.cn/api/gpt', //应用GPT-3.5-Turbo模型进行智能问答[无需key]
          'http://api.sc1.fun/API/ChatGPT.php', //ChatGPT-3.5连续对话模型[无需apikey,打造最优质的API]
          'https://api.a20safe.com/api.php', //版本ChatGPT3.5，支持连续对话，支持多对话[关注云析API铺获取key]
          'http://xinnai.521314.love/API/ChatGPT.php', //ChatGPT-3.5连续对话模型[无需apikey,打造最优质的API]
      ];
      //请求参数,对应请求地址依次排序
      const paramsArray = [{
          message: msg
      },
      {
          msg: msg,
          type: 'wifi',
          mos: 'json',
          id: '1'
      },
      {
          api: '36',
          key: data[e.user_id].a20key,
          text: msg
      }, {
          msg: msg,
          type: 'wifi',
          mos: 'json',
          id: '1'
      }
      ];
      //  随机选择一个 URL 和对应的参数
      //  const randomIndex = Math.floor(Math.random() * urls.length);
      //  const selectedUrl = urls[randomIndex];
      let selectedUrl = urls[data[e.user_id].num];
      //  const selectedParams = paramsArray[randomIndex];
      let selectedParams = paramsArray[data[e.user_id].num];

      // 拼接选中的 URL 和参数
      const queryParams = Object.keys(selectedParams)
          .map(key => `${key}=${selectedParams[key]}`)
          .join('&');
      const finalUrl = `${selectedUrl}?${queryParams}`;
      let surl = await fetchData(finalUrl);
      let txts;
      if (surl) {
          if (parseInt(data[e.user_id].num) === 0) {
              txts = surl.answer;
          } else if (parseInt(data[e.user_id].num) === 1) {
              txts = surl.message
          } else if (parseInt(data[e.user_id].num) === 2) {
              /**if (surl ? .data ? .[0] ? .reply !== undefined) {
                  txts = surl.data[0].reply
              } else {
                  txts = surl.msg
              }*/
          } else if (parseInt(data[e.user_id].num) === 3) {
              txts = surl.message;
          } else {
              txts = surl;
          }
      } else {
          console.log(surl);
          return surl;
      }
      try {
          let durationInNanoseconds = process.hrtime(start);
          let durationInSeconds = durationInNanoseconds[0] + (durationInNanoseconds[1] / 1e9);
          //计算时间
          let hours = Math.floor(durationInSeconds / 3600);
          let minutes = Math.floor((durationInSeconds - hours * 3600) / 60);
          let seconds = Math.round(durationInSeconds - hours * 3600 - minutes * 60);
          let epct = await e.reply(
              `${txts}\n\n\n执行时长 ${hours} 时 ${minutes} 分 ${seconds} 秒\n共执行${data.school}次`, {
              at_sender: true
          }
          );
          if (!epct) {
              e.reply(`出错了:${epct}`)
          }
      } catch (err) {
          console.error(err);
          e.reply(`出错了:${err}`)
      }
      const updatedAt = Date.now();
      data[e.user_id].COOLDOWN_TIME = COOLDOWN_TIME;
      data[e.user_id].updatedAt = updatedAt;
      data.school++;
      jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(pathgpt, jsonData, 'utf8');
      return false;
  }
}
// 判断是否处于冷却状态
function isCooldown(userId) {
  if (data[userId]) {
      const elapsed = Date.now() - data.updatedAt;
      return elapsed < COOLDOWN_TIME;
  } else {
      return false;
  }
}
async function fetchData(url) {
  try {
      const response = await fetch(url);
      const contentType = await response.headers.get('content-type');
      console.log(contentType);
      let data;
      if (contentType.includes('application/json')) {
          data = await response.json();
      } else if (contentType.includes('text/html')) {
          data = await response.text();
      } else if (contentType.includes('application/xml')) {
          data = await response.text();
      } else {
          data = contentType;
      }
      console.log(data)
      return data;
  } catch (error) {
      console.error('获取数据时出错:', error);
  }
}