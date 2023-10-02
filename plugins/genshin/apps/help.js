import plugin from '../../../lib/plugins/plugin.js'
import Help from '../model/help.js'
import base from "../model/base.js";


export class help extends plugin {
  constructor() {
    super({
      name: '云崽帮助',
      dsc: '云崽帮助',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^(#|云崽)*(命令|帮助|菜单|help|说明|功能|指令|使用说明)$',
          fnc: 'help'
        }
      ]
    })
  }

  async help () {
    let data = await Help.get(this.e)
    if (!data) return
    await new base(this.e).Render('help', data)
  }
}
