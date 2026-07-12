// ============================================================================
// 常量配置模块 — 颜色菜单、生物翻译、死法配置、cause 映射等纯数据
// ============================================================================

export const COLOR_MENU = [
    { name: "§f瑞瑞白",            type: "solid",    codes: ["§f"] },
    { name: "§5暮光紫",            type: "solid",    codes: ["§5"] },
    { name: "§d萍琪粉",            type: "solid",    codes: ["§d"] },
    { name: "§6AJ橙",              type: "solid",    codes: ["§6"] },
    { name: "§9云宝蓝",            type: "solid",    codes: ["§9"] },
    { name: "§g小蝶黄",            type: "solid",    codes: ["§g"] },
    { name: "§b岚佑青",            type: "solid",    codes: ["§b"] },
    { name: "§3盾羊蓝",            type: "solid",    codes: ["§3"] },
    { name: "§a青草绿",            type: "solid",    codes: ["§a"] },
    { name: "§c烈焰红",            type: "solid",    codes: ["§c"] },
    { name: "§c彩§6虹§a小§b马",  type: "gradient", codes: ["§c", "§6", "§e", "§a", "§b", "§9", "§d"] },
    { name: "§b青§3蓝§9渐§1变",  type: "gradient", codes: ["§b", "§3", "§9", "§1"] },
    { name: "§4红§c黄§6渐§e变",  type: "gradient", codes: ["§4", "§c", "§6", "§e"] }
];

export const MOB_TRANSLATIONS = {
    "minecraft:zombie":            "僵尸",
    "minecraft:skeleton":          "骷髅",
    "minecraft:creeper":           "苦力怕",
    "minecraft:spider":            "蜘蛛",
    "minecraft:cave_spider":       "洞穴蜘蛛",
    "minecraft:enderman":          "末影人",
    "minecraft:witch":             "女巫",
    "minecraft:slime":             "史莱姆",
    "minecraft:piglin":            "猪灵",
    "minecraft:piglin_brute":      "猪灵蛮兵",
    "minecraft:zombified_piglin":  "僵尸猪灵",
    "minecraft:hoglin":            "霍格林",
    "minecraft:zoglin":            "僵尸霍格林",
    "minecraft:ghast":             "恶魂",
    "minecraft:blaze":             "烈焰人",
    "minecraft:magma_cube":        "岩浆怪",
    "minecraft:wither_skeleton":   "凋灵骷髅",
    "minecraft:wither":            "凋灵",
    "minecraft:ender_dragon":      "末影龙",
    "minecraft:drowned":           "溺尸",
    "minecraft:husk":              "尸壳",
    "minecraft:stray":             "流浪者",
    "minecraft:phantom":           "幻翼",
    "minecraft:pillager":          "掠夺者",
    "minecraft:vindicator":        "卫道士",
    "minecraft:evoker":            "唤魔者",
    "minecraft:ravager":           "劫掠兽",
    "minecraft:vex":               "恼鬼",
    "minecraft:warden":            "监守者",
    "minecraft:shulker":           "潜影贝",
    "minecraft:guardian":          "守卫者",
    "minecraft:elder_guardian":    "远古守卫者",
    "minecraft:silverfish":        "蠹虫",
    "minecraft:endermite":         "末影螨",
    "minecraft:wolf":              "狼",
    "minecraft:iron_golem":        "铁傀儡",
    "minecraft:snow_golem":        "雪傀儡",
    "minecraft:bee":               "蜜蜂",
    "minecraft:polar_bear":        "北极熊",
    "minecraft:llama":             "羊驼",
    "minecraft:trader_llama":      "流浪商人的羊驼",
    "minecraft:panda":             "熊猫",
    "minecraft:fox":               "狐狸",
    "minecraft:goat":              "山羊",
    "minecraft:breeze":            "旋风人",
    "minecraft:bogged":            "沼泽骷髅"
};

// 击杀武器中文名映射（仅限 PvP 常见武器，其余回退 typeId 清洗）
export const PVP_WEAPON_NAMES = {
    "minecraft:wooden_sword":      "木剑",
    "minecraft:stone_sword":       "石剑",
    "minecraft:iron_sword":        "铁剑",
    "minecraft:golden_sword":      "金剑",
    "minecraft:diamond_sword":     "钻石剑",
    "minecraft:netherite_sword":   "下界合金剑",
    "minecraft:wooden_axe":        "木斧",
    "minecraft:stone_axe":         "石斧",
    "minecraft:iron_axe":          "铁斧",
    "minecraft:golden_axe":        "金斧",
    "minecraft:diamond_axe":       "钻石斧",
    "minecraft:netherite_axe":     "下界合金斧",
    "minecraft:trident":           "三叉戟",
    "minecraft:bow":               "弓",
    "minecraft:crossbow":          "弩",
    "minecraft:mace":              "重锤",
};

export const DEFAULT_JOIN_MSG  = "§8[§a+§8] §r{player} §e加入了游戏";
export const DEFAULT_LEAVE_MSG = "§8[§c-§8] §r{player} §e离开了游戏";

export const DEATH_CAUSES = [
    { key: "entityAttack_player", name: "近战 (被玩家)",      default: "§c{killer}§7{weapon}将§r{player}§7踹翻在地" },
    { key: "entityAttack_mob",    name: "近战 (被生物)",      default: "§r{player} §7被 §c{killer} §7按在地上摩擦" },
    { key: "projectile_player",   name: "射击 (被玩家)",      default: "§c{killer}§7{weapon}将§r{player}§7秀翻了" },
    { key: "projectile_mob",      name: "射击 (被生物)",      default: "§r{player} §7被 §c{killer} §7射成了刺猬" },
    { key: "fall",                name: "高处坠落",           default: "§r{player} §7尝试像天马一样飞行，但是忘记自己没有翅膀" },
    { key: "lava",                name: "掉入熔岩",           default: "§r{player} §7试图在岩浆中泡澡，结果把自己煮熟了" },
    { key: "fire",                name: "火焰烧死",           default: "§r{player} §7忘了自己不是火龙，在火焰中化为灰烬" },
    { key: "drowning",            name: "水中淹死",           default: "§r{player} §7以为自己是海马，结果发现只是普通小马" },
    { key: "suffocation",         name: "方块窒息",           default: "§r{player} §7把头埋进了沙子里，忘记了呼吸" },
    { key: "explosion",           name: "爆炸炸死",           default: "§r{player} §7伴随着一声巨响，被炸成了绚丽的烟花" },
    { key: "starve",              name: "饥饿饿死",           default: "§r{player} §7因为没吃到小马饼干，活活饿死了" },
    { key: "wither",              name: "凋零状态",           default: "§r{player} §7被凋零诅咒，化作了尘土" },
    { key: "void",                name: "掉入虚空",           default: "§r{player} §7掉进了世界尽头的虚空，再也回不来了" },
    { key: "suicide",             name: "自杀指令",           default: "§r{player} §7对自己使用了/kill，结束了痛苦" },
    { key: "magic",               name: "魔法伤害",           default: "§r{player} §7被一道神秘的魔法击中，瞬间倒地" },
    { key: "lightning",           name: "雷劈电击",           default: "§r{player} §7发誓时被雷劈中，也许不该乱发誓" },
    { key: "freezing",            name: "细雪冻伤",           default: "§r{player} §7在细雪中变成了一座冰雕" },
    { key: "contact",             name: "接触伤害 (仙人掌等)",   default: "§r{player} §7试图与仙人掌亲密接触，把自己扎成了刺猬" },
    { key: "contact_player",      name: "接触伤害 (被玩家推入)", default: "§r{player} §7被 §c{killer}§7{weapon}推进了仙人掌堆里" },
    { key: "fallingBlock",        name: "被方块砸死",         default: "§r{player} §7被掉落的铁砧砸成了小马饼" },
    { key: "thorns_player",       name: "荆棘反弹 (被玩家)",  default: "§r{player} §7攻击 §c{killer} §7，却被荆棘反伤致死" },
    { key: "thorns_mob",          name: "荆棘反弹 (被生物)",  default: "§r{player} §7攻击 §c{killer} §7，却被荆棘反伤致死" },
    { key: "default",             name: "未知/其他死法",      default: "§r{player} §7以一种不可思议的方式离开了这个世界" }
];

// 死法 key → 默认文本 的 O(1) 查找表
export const DEATH_DEFAULTS = new Map(DEATH_CAUSES.map(c => [c.key, c.default]));

// 原版 cause → 死法基 key 映射（O(1) 替代 if-else 链）
export const CAUSE_BASE_KEY = {
    "entityAttack":    "entityAttack",
    "contact":         "contact",
    "projectile":      "projectile",
    "fall":            "fall",
    "lava":            "lava",
    "fire":            "fire",
    "fireTick":        "fire",
    "drowning":        "drowning",
    "suffocation":     "suffocation",
    "blockExplosion":  "explosion",
    "entityExplosion": "explosion",
    "starve":          "starve",
    "wither":          "wither",
    "void":            "void",
    "suicide":         "suicide",
    "magic":           "magic",
    "lightning":       "lightning",
    "freezing":        "freezing",
    "fallingBlock":    "fallingBlock",
    "thorns":          "thorns",
};

// 需要追加 _player / _mob 后缀的 cause 集合
export const SUFFIXED_CAUSES = new Set(["entityAttack", "projectile", "thorns"]);
