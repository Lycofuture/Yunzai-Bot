import md5 from 'md5'
import lodash from 'lodash'
import fetch from 'node-fetch'
import cfg from '../../../../lib/config/config.js'
import apiTool from './apiTool.js'

let HttpsProxyAgent = ''
export default class MysApi {
	/**
	 * @param uid 游戏uid
	 * @param cookie 米游社cookie
	 * @param option 其他参数
	 * @param isSr 是否星铁
	 * @param option.log 是否显示日志
	 */
	constructor(uid, cookie, option = {}, isSr = false) {
		this.uid = uid
		this.cookie = cookie
		this.isSr = isSr
		this.server = this.getServer()
		// eslint-disable-next-line new-cap
		this.apiTool = new apiTool(uid, this.server, isSr)
		/** 5分钟缓存 */
		this.cacheCd = 300
		
		this.option = {
			log: true,
			...option
		}
	}
	
	get device() {
		if (!this._device) this._device = `Yz-${md5(this.uid).substring(0, 5)}`
		return this._device
	}
	
	getUrl(type, data = {}) {
		let urlMap = this.apiTool.getUrlMap({
			...data,
			deviceId: this.device
		})
		
		if (!urlMap[type]) return false
		let {
			url,
			query = '',
			body = '',
			sign
		} = urlMap[type]
		
		if (query) url += `?${query}`
		if (body) body = JSON.stringify(body)
		
		let headers = this.getHeaders(query, body, sign)
		
		return {
			url,
			headers,
			body
		}
	}
	
	getServer() {
		let uid = this.uid
		switch (String(uid)[0]) {
			case '1':
			case '2':
				return this.isSr ? 'prod_gf_cn' : 'cn_gf01' // 官服
			case '5':
				return this.isSr ? 'prod_qd_cn' : 'cn_qd01' // B服
			case '6':
				return this.isSr ? 'prod_official_usa' : 'os_usa' // 美服
			case '7':
				return this.isSr ? 'prod_official_euro' : 'os_euro' // 欧服
			case '8':
				return this.isSr ? 'prod_official_asia' : 'os_asia' // 亚服
			case '9':
				return this.isSr ? 'prod_official_cht' : 'os_cht' // 港澳台服
		}
		return 'cn_gf01'
	}
	
	async getData(type, data = {}, cached = false) {
		let {
			url,
			headers,
			body
		} = this.getUrl(type, data)
		if (!url) return false
		
		let cacheKey = this.cacheKey(type, data)
		let cahce = await redis.get(cacheKey)
		if (cahce) return JSON.parse(cahce)
		
		headers.Cookie = this.cookie
		
		if (data.headers) {
			headers = { ...headers, ...data.headers }
			delete data.headers
		}
		
		let param = {
			headers,
			agent: await this.getAgent(),
			timeout: 10000
		}
		if (body) {
			param.method = 'post'
			param.body = body
		} else {
			param.method = 'get'
		}
		
		const start = Date.now()
		const response = await fetch(url, param)
		if (!response.ok) {
			logger.error(`[米游社接口][${type}][${this.uid}] ${response.status} ${response.statusText}`)
			return false
		}
		if (this.option.log) {
			logger.mark(`[米游社接口][${type}][${this.uid}] ${Date.now() - start}ms`)
		}
		const res = await response.json()
		if (!res) {
			logger.mark('mys接口没有返回')
			return false
		}
		
		if (res.retcode !== 0 && this.option.log) {
			logger.debug(`[米游社接口][请求参数] ${url} ${JSON.stringify(param)}`)
		}
		
		res.api = type
		
		if (cached) await this.cache(res, cacheKey)
		
		return res
	}
	
	getHeaders(query = '', body = '', sign = false) {
		const cn = {
			app_version: '2.59.1',
			User_Agent: `Mozilla/5.0 (Linux; Android 13; ${this.device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36 miHoYoBBS/2.59.1`,
			client_type: '5',
			Origin: 'https://webstatic.mihoyo.com',
			X_Requested_With: 'com.mihoyo.hyperion',
			Referer: 'https://webstatic.mihoyo.com',
			x_rpc_device_fp: md5(this.device).substring(0, 12)
		}
		const os = {
			app_version: '2.9.0',
			User_Agent: `Mozilla/5.0 (Linux; Android 12; ${this.device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.73 Mobile Safari/537.36 miHoYoBBSOversea/2.9.0`,
			client_type: '2',
			Origin: 'https://webstatic-sea.hoyolab.com',
			X_Requested_With: 'com.mihoyo.hoyolab',
			Referer: 'https://webstatic-sea.hoyolab.com',
			x_rpc_device_fp: md5(this.device).substring(0, 13)
		}
		let client
		if (this.server.startsWith('os')) {
			client = os
		} else {
			client = cn
		}
		if (sign) {
			return {
				'x-rpc-device_fp': client.x_rpc_device_fp,
				'x-rpc-client_type': client.client_type,
				DS: this.getDsSign(),
				'x-rpc-app_version': client.app_version,
				'User-Agent': `Mozilla/5.0 (Linux; Android 13; ${this.device}) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 miHoYoBBS/2.59.1`,
				'Content-Type': 'application/json;charset=UTF-8',
				'x-rpc-device_id': this.option.device_id || this.getGuid(),
				'x-rpc-sys_version': '13',
				Origin: 'https://webstatic.mihoyo.com',
				'X-Requested-With': 'com.mihoyo.hyperion',
				Referer: 'https://webstatic.mihoyo.com/'
			}
		}
		return {
			'x-rpc-app_version': client.app_version,
			'x-rpc-client_type': client.client_type,
			'x-rpc-device_fp': client.x_rpc_device_fp,
			'X-Requested-With': client.X_Requested_With,
			Accept: 'application/json, text/plain, */*',
			'User-Agent': client.User_Agent,
			Referer: client.Referer,
			DS: this.getDs(query, body)
		}
	}
	
	getDs(q = '', b = '') {
		let n = ''
		if ([ 'cn_gf01', 'cn_qd01', 'prod_gf_cn', 'prod_qd_cn' ].includes(this.server)) {
			n = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
		} else if (/os_|official/.test(this.server)) {
			n = 'okr4obncj8bw5a65hbnn5oo6ixjc3l9w'
		}
		const t = Math.round(new Date().getTime() / 1000)
		const r = Math.floor(Math.random() * 90000 + 10000)
		const DS = md5(`salt=${n}&t=${t}&r=1${r}&b=${b}&q=${q}`)
		return `${t},1${r},${DS}`
	}
	
	/** 签到ds */
	getDsSign() {
		/** @Womsxd */
		const n = '6pNd5NnDnbwKxewrPwEoWlSYwhualS2H'
		const t = Math.round(new Date().getTime() / 1000)
		const r = lodash.sampleSize('abcdefghijklmnopqrstuvwxyz0123456789', 6).join('')
		const DS = md5(`salt=${n}&t=${t}&r=${r}`)
		return `${t},${r},${DS}`
	}
	
	getGuid() {
		function S4() {
			return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
		}
		
		return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4())
	}
	
	cacheKey(type, data) {
		return 'Yz:genshin:mys:cache:' + md5(this.uid + type + JSON.stringify(data))
	}
	
	async cache(res, cacheKey) {
		if (!res || res.retcode !== 0) return
		redis.setEx(cacheKey, this.cacheCd, JSON.stringify(res))
	}
	
	async getAgent() {
		let proxyAddress = cfg.bot.proxyAddress
		if (!proxyAddress) return null
		if (proxyAddress === 'http://0.0.0.0:0') return null
		
		if (!this.server.startsWith('os')) return null
		
		if (HttpsProxyAgent === '') {
			HttpsProxyAgent = await import('https-proxy-agent').catch((err) => {
				logger.error(err)
			})
			
			HttpsProxyAgent = HttpsProxyAgent ? HttpsProxyAgent.default : undefined
		}
		
		if (HttpsProxyAgent) {
			return new HttpsProxyAgent(proxyAddress)
		}
		
		return null
	}
}
