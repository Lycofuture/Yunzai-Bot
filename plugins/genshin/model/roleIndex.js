import base from './base.js'
import MysInfo from './mys/mysInfo.js'
import gsCfg from './gsCfg.js'
import lodash from 'lodash'
import moment from 'moment'
import fs from 'node:fs'

let imgFile = {}

export default class RoleIndex extends base {
    constructor(e) {
        super(e)
        this.model = 'roleIndex'
        this.other = gsCfg.getdefSet('role', 'other')
        this.wother = gsCfg.getdefSet('weapon', 'other')

        this.area = {
            '蒙德': 1,
            '璃月': 2,
            '雪山': 3,
            '稻妻': 4,
            '渊下宫': 5,
            '层岩巨渊': 6,
            '层岩地下': 7,
            '须弥': 8
        }

        this.areaName = lodash.invert(this.area)

        this.headIndexStyle = `<style> .head_box { background: #f5f5f5 url(${this.screenData.pluResPath}img/roleIndex/namecard/${lodash.random(1, 8)}.png) no-repeat; background-position-x: 30px;  border-radius: 15px; font-family: tttgbnumber,serif; padding: 10px 20px; position: relative; background-size: auto 101%; }</style>`
    }

    static async get(e) {
        let roleIndex = new RoleIndex(e)
        let res = await roleIndex.ApiData()
        if (!res || res[0].retcode !== 0) return false
        return await roleIndex.roleData(res)
    }

    async ApiData() {
        let ApiData = {
            index: '',
            spiralAbyss: {schedule_type: 1},
            character: '',
            basicInfo: ''
        }
        let res = await MysInfo.get(this.e, ApiData)
        if (!res || res[0].retcode !== 0 || res[2].retcode !== 0) return false
        /** 截图数据 */
        return res
    }

    // 处理深渊数据
    abyssAll(roleArr, resAbyss) {
        let abyss = {}
        if (!resAbyss?.reveal_rank) return false
        if (roleArr.length <= 0) {
            return abyss
        }
        if (resAbyss?.total_battle_times <= 0) {
            return abyss
        }
        if (resAbyss?.reveal_rank.length <= 0) {
            return abyss
        }
        // 打了三层才放出来
        if (resAbyss?.floors.length <= 2) {
            return abyss
        }

        let startTime = moment(resAbyss.startTime)
        let time = Number(startTime.month()) + 1
        if (startTime.day() >= 15) {
            time = time + '月下'
        } else {
            time = time + '月上'
        }

        let totalStar = 0
        let star = []
        for (let val of resAbyss.floors) {
            if (val.index < 9) {
                continue
            }
            totalStar += val.star
            star.push(val.star)
        }
        totalStar = totalStar + '（' + star.join('-') + '）'

        let dataName = ['damage', 'take_damage', 'defeat', 'normal_skill', 'energy_skill']
        let data = []
        let tmpRole = []
        for (let val of dataName) {
            if (resAbyss[`${val}_rank`].length <= 0) {
                resAbyss[`${val}_rank`] = [
                    {
                        value: 0,
                        avatar_id: 10000007
                    }
                ]
            }
            data[val] = {
                num: resAbyss[`${val}_rank`][0].value,
                name: gsCfg.roleIdToName(resAbyss[`${val}_rank`][0].avatar_id)
            }

            if (data[val].num > 1000) {
                data[val].num = (data[val].num / 10000).toFixed(1)
                data[val].num += ' w'
            }

            if (tmpRole.length < 4 && !tmpRole.includes(resAbyss[`${val}_rank`][0].avatar_id)) {
                tmpRole.push(resAbyss[`${val}_rank`][0].avatar_id)
            }
        }

        let list = []

        let avatar = lodash.keyBy(roleArr, 'id')

        for (let val of resAbyss.reveal_rank) {
            if (avatar[val.avatar_id]) {
                val.life = avatar[val.avatar_id].actived_constellation_num
            } else {
                val.life = 0
            }
            val.name = gsCfg.roleIdToName(val.avatar_id)
            list.push(val)
        }

        return {
            time,
            max_floor: resAbyss.max_floor,
            totalStar,
            list,
            total_battle_times: resAbyss.total_battle_times,
            ...data
        }
    }

    // 计算活跃天数
    dayCount(num) {
        let yea = Math.floor(num / 365)
        let month = Math.floor((num % 365) / 30.41)
        let day = Math.floor((num % 365) % 30.41)
        let msg = ''
        if (yea > 0) {
            msg += yea + '年'
        }
        if (month > 0) {
            msg += month + '个月'
        }
        if (day > 0) {
            msg += day + '天'
        }
        return msg
    }

    async roleCard() {
        this.model = 'roleCard'
        let res = await MysInfo.get(this.e, 'index')

        if (!res || res.retcode !== 0) return false

        return this.roleData(res)
    }

    async roleExplore() {
        this.model = 'roleExplore'
        const res = await this.ApiData()

        if (!res || res[0].retcode !== 0) return false
        return this.roleData(res)
    }

    async roleData(res) {
        // 头像部分
        let role, avatars, stats, world_explorations, homes, basicInfo, array
        if (Array.isArray(res)) {
            role = res[0].data.role
            avatars = res[2].data.avatars
            stats = res[0].data.stats
            world_explorations = res[0].data.world_explorations
            homes = res[0].data.homes
            // 七胜召唤
            basicInfo = res[3].data
            array = res[1].data
        } else {
            role = res.data.role
            avatars = res.data.avatars
            stats = res.data.stats
            world_explorations = res.data.world_explorations
            homes = res.data.homes
            basicInfo = res.data
            array = res.data
        }
        // 角色部分
        avatars = avatars.filter(v => v.is_chosen === true)
        avatars = lodash.orderBy(avatars, ['rarity'], ['desc'])
        let element = gsCfg.getdefSet('element', 'role')
        for (let i in avatars) {
            if (avatars[i].id === 10000005) avatars[i].name = '空'
            if (avatars[i].id === 10000007) avatars[i].name = '荧'
            avatars[i].element = element[avatars[i].name]
            avatars[i].img = imgFile[avatars[i].name] || `${avatars[i].name}.png`
            avatars[i].weapon.showName = this.wother.sortName[avatars[i].weapon.name] ?? avatars[i].weapon.name
        }

        // 详情部分
        let line = [
            [
                // { lable: '等级', num: res.role.level ?? 0 },
                {lable: '活跃天数', num: stats.active_day_number},
                {lable: '深境螺旋', num: stats.spiral_abyss},
                {lable: '解锁传送点', num: stats.way_point_number},
                {lable: '解锁秘境', num: stats.domain_number},
                {lable: '达成成就', num: stats.achievement_number}
            ],
            [
                {lable: '获得角色', num: stats.avatar_number},
                {
                    lable: '总宝箱',
                    num: stats.luxurious_chest_number + stats.precious_chest_number + stats.exquisite_chest_number + stats.common_chest_number + stats.magic_chest_number
                },
                {lable: '华丽宝箱', num: stats.luxurious_chest_number},
                {lable: '珍贵宝箱', num: stats.precious_chest_number},
                {lable: '精致宝箱', num: stats.exquisite_chest_number}
            ],
            [
                {lable: '普通宝箱', num: stats.common_chest_number},
                {lable: '奇馈宝箱', num: stats.magic_chest_number},
                {lable: '草神瞳', num: stats.dendroculus_number},
                {lable: '雷神瞳', num: stats.electroculus_number},
                {lable: '岩神瞳', num: stats.geoculus_number}
            ],
            [
                {lable: '风神瞳', num: stats.anemoculus_number},
                {lable: '水神瞳', num: stats.hydroculus_number},
                {lable: '火神瞳', num: '待实装'},
                {lable: '冰神瞳', num: '待实装'}
            ]
        ]

        // 探索度部分
        world_explorations = lodash.orderBy(world_explorations, ['id'], ['desc'])
        const explor = []
        for (let val of world_explorations) {
            if (val.id === 7) continue

            val.name = this.areaName[val.id] ? this.areaName[val.id] : lodash.truncate(val.name, {length: 6})

            let tmp = {
                name: val.name,
                line: [
                    {
                        name: val.name,
                        text: `${val.exploration_percentage / 10}%`
                    }
                ]
            }

            if (['蒙德', '璃月', '稻妻', '须弥', '枫丹'].includes(val.name)) {
                tmp.line.push({
                    name: '声望',
                    text: `${val.level}级`
                })
            }

            if (val.id === 6) {
                let underground = lodash.find(world_explorations, function (o) {
                    return o.id === 7
                })
                if (underground) {
                    tmp.line.push({
                        name: this.areaName[underground.id],
                        text: `${underground.exploration_percentage / 10}%`
                    })
                }
            }

            if (['雪山', '稻妻', '层岩巨渊', '须弥', '枫丹'].includes(val.name)) {
                if (val.offerings[0].name === '露景泉') {
                    val.offerings[0].name = '露景泉'
                }
                if (val.offerings[0].name === '梦之树') {
                    val.offerings[0].name = '梦之树'
                }
                if (val.offerings[0].name === '流明石触媒') {
                    val.offerings[0].name = '流明石'
                }
                if (val.offerings[0].name === '神樱眷顾') {
                    val.offerings[0].name = '神樱眷顾'
                }
                if (val.offerings[0].name === '忍冬之树') {
                    val.offerings[0].name = '忍冬之树'
                }

                tmp.line.push({
                    name: val.offerings[0].name,
                    text: `${val.offerings[0].level}级`
                })
            }
            explor.push(tmp)
        }

        // 尘歌壶部分
        const home = []
        const i = Math.floor(Math.random() * homes.length)
        let tmp = {
            name: homes[i].name,
            icon: homes[i].icon,
            cl_name: homes[i].comfort_level_name,
            cl_icon: homes[i].comfort_level_icon,
            line: [
                {lable: '家园等级', num: homes[i].level},
                {lable: '最高仙力', num: homes[i].comfort_num},
                {lable: '获得摆设', num: homes[i].item_num},
                {lable: '历史访客', num: homes[i].visit_num}
            ]
        }
        home.push(tmp)

        // 深渊
        let abyss = this.abyssAll(avatars, array)
        return {
            saveId: this.e.uid,
            uid: this.e.uid,
            user_id: this.e.user_id,
            role,
            avatars,
            line,
            home,
            explor,
            basicInfo,
            abyss,
            activeDay:this.dayCount(stats.active_day_number),
            bg: lodash.random(1, 3),
            ...this.screenData,
            headIndexStyle: this.headIndexStyle
        }
    }
}
