import * as UI from "@minecraft/server-ui";
import { engine } from "./core_engine.js";
import { world, system } from "@minecraft/server";

export const MOB_DATA = {
    // --- 主世界：敌对 ---
    "minecraft:creeper": {
        name: "苦力怕", cat: "§2地表",
        desc: "因代码出错而产生的寂静生物。靠近后会爆炸。",
        hp: 20, dmg: "6-49（视距离而定）", loots: "火药",
        utility: "挖掘和鞘翅火箭不可或缺的材料。"
    },
    "minecraft:zombie": {
        name: "僵尸", cat: "§2地表",
        desc: "怕阳光的不死族。可感染村民。",
        hp: 20, dmg: "3", loots: "腐肉、铁锭",
        utility: "通过感染/治疗村民来降低交易价格。"
    },
    "minecraft:skeleton": {
        name: "骷髅", cat: "§2地表",
        desc: "精准的弓箭手。害怕驯服的狼。",
        hp: 20, dmg: "1-4", loots: "骨头、箭矢",
        utility: "骨粉的主要来源，可加速作物生长。"
    },
    "minecraft:spider": {
        name: "蜘蛛", cat: "§2地表",
        desc: "敏捷，可爬墙。白天为中立。",
        hp: 16, dmg: "2-3", loots: "线、蜘蛛眼",
        utility: "制作弓、钓鱼竿和酿造药水必需。"
    },
    "minecraft:witch": {
        name: "女巫", cat: "§2地表",
        desc: "敌对炼金术士，投掷剧毒和减速药水。",
        hp: 26, dmg: "药水", loots: "红石粉、荧石粉、糖",
        utility: "可再生科技组件的最佳来源。"
    },
    "minecraft:phantom": {
        name: "幻翼", cat: "§b天空",
        desc: "长期不睡觉就会在空中生成并俯冲攻击。",
        hp: 20, dmg: "2-3", loots: "幻翼膜",
        utility: "修复鞘翅和酿造缓降药水。"
    },
    "minecraft:slime": {
        name: "史莱姆", cat: "§a沼泽/洞穴",
        desc: "会分裂为三种大小。在地面大量繁殖（严重卡顿）。",
        hp: 16, dmg: "4", loots: "粘液球",
        utility: "制作粘性活塞和红石机械的核心材料。"
    },

    // --- 下界：敌对 ---
    "minecraft:blaze": {
        name: "烈焰人", cat: "§6下界",
        desc: "守卫下界要塞的火焰生物。",
        hp: 20, dmg: "5 + 火焰", loots: "烈焰棒",
        utility: "炼药燃料，也是制作末影之眼的材料。"
    },
    "minecraft:ghast": {
        name: "恶魂", cat: "§6下界",
        desc: "哭泣的巨型幽灵，发射爆炸性火球。",
        hp: 10, dmg: "6", loots: "恶魂之泪、火药",
        utility: "酿造再生药水和制作末影水晶的必需品。"
    },
    "minecraft:piglin": {
        name: "猪灵", cat: "§6下界",
        desc: "痴迷于黄金的下界文明。不穿金甲即敌对。",
        hp: 16, dmg: "视武器而定", loots: "金锭、装备",
        utility: "以物易物可快速换取稀有资源。"
    },
    "minecraft:wither_skeleton": {
        name: "凋灵骷髅", cat: "§6下界",
        desc: "高大的黑色骷髅。攻击附带凋零效果。",
        hp: 20, dmg: "8 + 凋零", loots: "凋灵骷髅头颅、煤炭",
        utility: "召唤凋灵和获得信标的必需材料。"
    },

    // --- 末地与深海 ---
    "minecraft:enderman": {
        name: "末影人", cat: "§u末地",
        desc: "末地的异常生物。会瞬移且怕水。",
        hp: 40, dmg: "7", loots: "末影珍珠",
        utility: "进入末地城和传送的唯一途径。"
    },
    "minecraft:shulker": {
        name: "潜影贝", cat: "§u末地",
        desc: "末地城的守卫者，藏在紫珀壳中。",
        hp: 30, dmg: "4 + 漂浮", loots: "潜影壳",
        utility: "制作可随身携带的潜影盒。"
    },
    "minecraft:guardian": {
        name: "守卫者", cat: "§3海洋",
        desc: "海底遗迹的哨兵，发射不稳定激光。",
        hp: 30, dmg: "6", loots: "海晶石、鱼",
        utility: "海晶石的唯一来源，用于水下建筑。"
    },
    "minecraft:drowned": {
        name: "溺尸", cat: "§3海洋",
        desc: "水下僵尸。可能手持致命三叉戟。",
        hp: 20, dmg: "视武器而定", loots: "鹦鹉螺壳、金锭、三叉戟",
        utility: "获取三叉戟和潮涌核心的唯一途径。"
    },

    // --- 特殊（高卡顿）---
    "minecraft:warden": {
        name: "监守者", cat: "§1深渊",
        desc: "失明但听觉超强的深渊守护者。",
        hp: 500, dmg: "30", loots: "幽匿催发体",
        utility: "终极挑战。守护古城宝藏。"
    },
    "minecraft:villager": {
        name: "村民", cat: "§e文明",
        desc: "复杂 AI。管理职业和交易（CPU 负载较高）。",
        hp: 20, dmg: "0", loots: "无",
        utility: "经济支柱。可获取附魔书等珍贵物品。"
    }
};

/**
 * 显示生物图鉴主菜单
 */
export function showBestiaryMenu(player) {
    const menu = new UI.ActionFormData()
        .title("§0§lAEGIS 生物图鉴§r")
        .body("§7欢迎来到物种控制中心。\n§8提示：禁用村民可释放大量 RAM。");

    for (const [id, data] of Object.entries(MOB_DATA)) {
        const isBlacklisted = engine.settings.blacklistedMobs.includes(id);
        menu.button(`${data.cat} §l${data.name}§r\n${isBlacklisted ? "§c[已禁用]" : "§a[活跃]"}`);
    }

    menu.show(player).then(result => {
        if (result.canceled) return;
        const mobId = Object.keys(MOB_DATA)[result.selection];
        showMobDetails(player, mobId);
    });
}

/**
 * 显示详细生物信息
 */
function showMobDetails(player, mobId) {
    const data = MOB_DATA[mobId];
    const isBlacklisted = engine.settings.blacklistedMobs.includes(mobId);

    const details = new UI.ActionFormData()
        .title(`§l资料：${data.name}`)
        .body(
            `§7--- 生物学 ---\n§f${data.desc}\n\n` +
            `§c❤ 生命值：§f${data.hp} HP  §4⚔ 伤害：§f${data.dmg}\n` +
            `§6💎 掉落物：§f${data.loots}\n\n` +
            `§b💡 战略价值：\n§f${data.utility}\n\n` +
            `§8系统 ID：${mobId}\n` +
            `§7------------------\n` +
            `§7状态：${isBlacklisted ? "§c已禁用" : "§a已允许"}`
        )
        .button(isBlacklisted ? "§a允许生成" : "§c禁止生成")
        .button("§8返回");

    details.show(player).then(result => {
        if (result.canceled || result.selection === 1) {
            showBestiaryMenu(player);
            return;
        }

        if (isBlacklisted) {
            engine.settings.blacklistedMobs = engine.settings.blacklistedMobs.filter(id => id !== mobId);
            engine.saveBlacklist();
            player.sendMessage(`§b[Aegis]§f 物种 §a${data.name}§f 已重新允许。`);
        } else {
            engine.settings.blacklistedMobs.push(mobId);
            engine.saveBlacklist();
            
            // 立即清除已存在的生物
            const entities = player.dimension.getEntities({ type: mobId });
            entities.forEach(e => e.remove());
            player.sendMessage(`§b[Aegis]§f 物种 §c${data.name}§f 已被禁止生成。`);
        }
        showBestiaryMenu(player);
    });
}
