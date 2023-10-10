import template from 'art-template'
import fs from 'fs'
import lodash from 'lodash'
import chokidar from 'chokidar'
import cfg from '../config/config.js'
import common from "../common/common.js";

const _path = process.cwd()
// 超时计时器
let overtimeList = []
let puppeteer = {}

class Puppeteer {
    constructor() {
        this.browser = false
        this.lock = false
        this.shoting = []
        /** 截图数达到时重启浏览器 避免生成速度越来越慢 */
        this.restartNum = 100
        /** 截图次数 */
        this.renderNum = 0
        this.config = {
            headless: 'new',
            args: [
                '--disable-gpu',
                '--disable-setuid-sandbox',
                '--no-sandbox',
                '--no-zygote'
            ]
        }

        if (cfg.bot?.chromium_path) {
            /** chromium其他路径 */
            this.config.executablePath = cfg.bot.chromium_path
        }
        /** puppeteer超时超时时间 */
        this.puppeteerTimeout = cfg.bot?.puppeteer_timeout || 0
        this.html = {}
        this.watcher = {}
        this.createDir('./data/html')
    }

    async initPupp() {
        if (!lodash.isEmpty(puppeteer)) return puppeteer

        puppeteer = (await import('puppeteer')).default

        return puppeteer
    }

    createDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
        }
    }

    /**
     * 初始化chromium
     */
    async browserInit() {
        await this.initPupp()
        if (this.browser) return this.browser
        if (this.lock) return false
        this.lock = true

        logger.mark('puppeteer Chromium 启动中...')

        /** 初始化puppeteer */
        this.browser = await puppeteer.launch(this.config).catch((err) => {
            if (typeof err == 'object') {
                logger.error(JSON.stringify(err))
            } else {
                logger.error(err.toString())
                if (err.toString().includes('Could not find Chromium')) {
                    logger.error('没有正确安装Chromium，可以尝试执行安装命令：node ./node_modules/puppeteer/install.js')
                }
            }
        })

        this.lock = false
        if (!this.browser) {
            logger.error('puppeteer Chromium 启动失败')
            return false
        }
        logger.mark('puppeteer Chromium 启动成功')

        /** 监听Chromium实例是否断开 */
        this.browser.on('disconnected', (e) => {
            logger.error('Chromium实例关闭或崩溃！')
            this.browser = false
        })

        return this.browser
    }

    /**
     * `chromium` 截图
     * @param name
     * @param data 模板参数
     * @param data.tplFile 模板路径，必传
     * @param data.saveId  生成html名称，为空name代替
     * @param data.imgType  screenshot参数，生成图片类型：jpeg，png
     * @param data.quality  screenshot参数，图片质量 0-100，jpeg是可传，默认90
     * @param data.omitBackground  screenshot参数，隐藏默认的白色背景，背景透明。默认不透明
     * @param data.path   screenshot参数，截图保存路径。截图图片类型将从文件扩展名推断出来。如果是相对路径，则从当前路径解析。如果没有指定路径，图片将不会保存到硬盘。
     * @param data.multiPage 是否分页截图，默认false
     * @param data.multiPageHeight 分页状态下页面高度，默认4000
     * @param data.pageGotoParams 页面goto时的参数
     * @returns {Promise<Object|*[]|boolean>}
     */

    async screenshot(name, data = {}) {
        if (!await this.browserInit()) {
            return false
        }
        const pageHeight = data.multiPageHeight || 4000

        let savePath = this.dealTpl(name, data)
        if (!savePath) return false

        let buff = ''
        let start = Date.now()
        let ret = []
        this.shoting.push(name)
        const puppeteerTimeout = this.puppeteerTimeout
        let overtime
        let overtimeFlag = false
        if (puppeteerTimeout > 0) {
            // TODO 截图超时处理
            overtime = setTimeout(() => {
                if (!overtimeFlag) {
                    logger.error(`[图片生成][${name}] 截图超时，当前等待队列：${this.shoting.join(',')}`)
                    this.restart(true)
                    this.shoting = []
                    overtimeList.forEach(item => {
                        clearTimeout(item)
                    })
                }
            }, puppeteerTimeout)
        }
        try {
            const page = await this.browser.newPage()
            let pageGotoParams = lodash.extend({timeout: 120000}, data.pageGotoParams || {})
            await page.goto(`file://${_path}${lodash.trim(savePath, '.')}`, pageGotoParams)
            let body = await page.$('#container') || await page.$('body')

            // 计算页面高度
            const boundingBox = await body.boundingBox()
            // 分页数
            let num = 1

            let randData = {
                type: data.imgType || 'jpeg',
                omitBackground: data.omitBackground || false,
                quality: data.quality || 90,
                path: data.path || ''
            }

            if (data.multiPage) {
                randData.type = 'jpeg'
                num = Math.round(boundingBox.height / pageHeight) || 1
            }
            if (data.imgType === 'png') delete randData.quality

            if (!data.multiPage) {
                buff = await body.screenshot(randData)
                /** 计算图片大小 */
                const kb = (buff.length / 1024).toFixed(2) + 'KB'
                logger.mark(`[图片生成][${name}][${this.renderNum}次] ${kb} ${logger.green(`${Date.now() - start}ms`)}`)
                this.renderNum++
                ret.push(buff)
            } else {
                // 分片截图
                if (num > 1) {
                    await page.setViewport({
                        width: boundingBox.width,
                        height: pageHeight + 100
                    })
                }
                for (let i = 1; i <= num; i++) {
                    if (i !== 1 && i === num) {
                        await page.setViewport({
                            width: boundingBox.width,
                            height: parseInt(boundingBox.height) - pageHeight * (num - 1)
                        })
                    }
                    if (i !== 1 && i <= num) {
                        await page.evaluate(pageHeight => window.scrollBy(0, pageHeight), pageHeight)
                    }
                    if (num === 1) {
                        buff = await body.screenshot(randData)
                    } else {
                        buff = await page.screenshot(randData)
                    }
                    if (num > 2) {
                        await common.sleep(200)
                    }
                    this.renderNum++

                    /** 计算图片大小 */
                    const kb = (buff.length / 1024).toFixed(2) + 'KB'
                    logger.mark(`[图片生成][${name}][${i}/${num}] ${kb}`)
                    ret.push(buff)
                }
                if (num > 1) {
                    logger.mark(`[图片生成][${name}] 处理完成`)
                }
            }

            page.close().catch((err) => logger.error(err))
        } catch (error) {
            logger.error(`图片生成失败:${name}:${error}`)
            /** 关闭浏览器 */
            if (this.browser) {
                await this.browser.close().catch((err) => logger.error(err))
            }
            this.browser = false
            ret = []
            return false
        } finally {
            if (overtime) {
                overtimeFlag = true
                clearTimeout(overtime)
                overtimeList = []
            }
        }

        this.shoting.pop()

        if (ret.length === 0 || !ret[0]) {
            logger.error(`图片生成为空:${name}`)
            return false
        }
        const images = []
        this.restart(false)
        if (data.multiPage) {
            for (let i in ret) {
                images.push(segment.image(ret[i]))
            }
            return images
        }
        return segment.image(ret[0])
    }

    /** 模板 */
    dealTpl(name, data) {
        let {tplFile, saveId = name} = data
        let savePath = `./data/html/${name}/${saveId}.html`

        /** 读取html模板 */
        if (!this.html[tplFile]) {
            this.createDir(`./data/html/${name}`)

            try {
                this.html[tplFile] = fs.readFileSync(tplFile, 'utf8')
            } catch (error) {
                logger.error(`加载html错误：${tplFile}`)
                return false
            }

            this.watch(tplFile)
        }

        // data.resPath = `${_path}/resources/`

        /** 替换模板 */
        let tmpHtml = template.render(this.html[tplFile], data)

        /** 保存模板 */
        fs.writeFileSync(savePath, tmpHtml)

        logger.debug(`[图片生成][使用模板] ${savePath}`)

        return savePath
    }

    /** 监听配置文件 */
    watch(tplFile) {
        if (this.watcher[tplFile]) return

        const watcher = chokidar.watch(tplFile)
        watcher.on('change', path => {
            delete this.html[tplFile]
            logger.mark(`[修改html模板] ${tplFile}`)
        })

        this.watcher[tplFile] = watcher
    }

    /** 重启 */
    restart(force = false) {
        /** 截图超过重启数时，自动关闭重启浏览器，避免生成速度越来越慢 */
        if (this.renderNum % this.restartNum === 0 || force) {
            if (this.shoting.length <= 0 || force) {
                setTimeout(async () => {
                    if (this.browser) {
                        await this.browser.close().catch((err) => logger.error(err))
                    }
                    this.browser = false
                    logger.mark(`puppeteer Chromium ${force ? '强制' : ''}关闭重启...`)
                }, 100)
            }
        }
    }
}

export default new Puppeteer()
