import fs from 'node:fs'
import lodash from "lodash";
import Runtime from "../../../lib/plugins/runtime.js";

export default class base {
    constructor(e = {}) {
        this.e = e
        this.userId = e?.user_id
        this.model = 'genshin'
        this._path = process.cwd().replace(/\\/g, '/')
    }

    get prefix() {
        return `Yz:genshin:${this.model}:`
    }

    /**
     * 截图默认数据
     * * saveId html保存id
     * * tplFile 模板html路径
     * * pluResPath 插件资源路径
     * @returns {{pluResPath: string, cwd: string, saveId, headStyle: string, resPath: string}}
     */

    get screenData() {
        const headImg = lodash.sample(fs.readdirSync(`${this._path}/plugins/genshin/resources/img/namecard`).filter(file => file.endsWith('.png')))
        const path = '../../../../'
        return {
            cwd: path,
            headStyle: `<style> .head_box { background: #fff url('${path}plugins/genshin/resources/img/namecard/${headImg}') no-repeat; background-position-x: 42px; background-size: auto 101%; }</style>`,
            pluResPath: `${path}plugins/genshin/resources/`,
            resPath: `${path}resources`,
            saveId: this.userId,
        }
    }

    /**
     * 渲染数据
     * @param name 渲染模板
     * @param data 渲染数据
     * @param cfg 返回数据
     * * default/空：自动发送图片，返回true
     * * msgId：自动发送图片，返回msg id
     * * base64: 不自动发送图像，返回图像base64数据
     * @returns {Promise<(*&{pluResPath: string, _plugin, _htmlPath, tplFile: string})|*>}
     * @constructor
     */
    async Render(name, data, cfg = 'default') {
        return await new Runtime(this.e).render('genshin', name, data, {
            beforeRender({data}) {
                return {
                    ...data,
                    tplFile: `./plugins/genshin/resources/html/${name}/${name}.html`,
                }
            },
            retType: cfg
        })
    }
}
