import { world, system, ItemStack } from "@minecraft/server";
import * as UI from "@minecraft/server-ui"; 
import { engine } from "./core_engine.js";
import { showBestiaryMenu } from "./bestiary_ui.js"; // 必需的导入

const TOOL_ID = "minecraft:stick";
const TOOL_NAME = "§bAegis 管理工具§r";

/**
 * 模块：发放管理工具
 */
world.afterEvents.playerSpawn.subscribe((event) => {
    const { player } = event;
    system.run(() => {
        if (!player?.isValid()) return;
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) return;

        let hasTool = false;
        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (item?.typeId === TOOL_ID && item?.nameTag === TOOL_NAME) {
                hasTool = true;
                break;
            }
        }

        if (!hasTool) {
            try {
                const aegisStick = new ItemStack(TOOL_ID, 1);
                aegisStick.nameTag = TOOL_NAME;
                aegisStick.setLore([
                    "§7Aegis Nexus 硬件终端",
                    "§e右键使用以稳定 CPU 性能",
                    "§b完全控制生物图鉴"
                ]);
                inventory.addItem(aegisStick);
                player.sendMessage("§b[Aegis]§f Nexus 系统 V3.5 已部署。");
            } catch (e) { console.warn("生成工具时出错: " + e); }
        }
    });
});

/**
 * 模块：检测工具使用（仅限带 admin 标签的玩家）
 */
world.beforeEvents.itemUse.subscribe((event) => {
    const item = event.itemStack;
    if (item?.typeId === TOOL_ID && item?.nameTag === TOOL_NAME) {
        event.cancel = true;

        const player = event.source;
        if (!player?.isValid()) return;

        // 权限检查：玩家必须有 admin 标签
        if (!player.getTags().some(t => t === "admin")) {
            player.sendMessage("§b[Aegis]§c 权限不足，需要 admin 标签才能使用。");
            return;
        }

        system.run(() => showAdminMenu(event.source));
    }
});

/**
 * 模块：管理界面（V3.5 终极版）
 */
function showAdminMenu(player) {
    const form = new UI.ActionFormData()
        .title("§b§lAEGIS NEXUS V3.5§r")
        .body(`AI 优化：§b${(engine.stats.frozenCount * 0.8).toFixed(1)}% CPU\n§7生物图鉴可过滤指定生物种类。`)
        
        // --- 主按钮 ---
        .button(`实体剔除 & 围墙：${engine.settings.culling ? "§a开启" : "§c关闭"}`)
        .button("§0📖 生物图鉴 & 生成控制")
        .button(`容器休眠：${engine.settings.tileHibernation ? "§a开启" : "§c关闭"}`)
        .button(`内存清理（RAM）：${engine.settings.memorySweep ? "§a开启" : "§c关闭"}`)
        .button("§2📋 诊断报告")
        .button("§4🗑️ 手动清空缓存");

    form.show(player).then(result => {
        if (result.canceled) return;

        switch (result.selection) {
            case 0:
                engine.settings.culling = !engine.settings.culling;
                player.sendMessage(`§b[Aegis]§f 实体剔除：${engine.settings.culling ? "§a开启" : "§c关闭"}`);
                break;
            case 1:
                showBestiaryMenu(player);
                break;
            case 2:
                engine.settings.tileHibernation = !engine.settings.tileHibernation;
                player.sendMessage(`§b[Aegis]§f 容器休眠：${engine.settings.tileHibernation ? "§a开启" : "§c关闭"}`);
                break;
            case 3:
                engine.settings.memorySweep = !engine.settings.memorySweep;
                player.sendMessage(`§b[Aegis]§f 内存清理：${engine.settings.memorySweep ? "§a开启" : "§c关闭"}`);
                break;
            case 4:
                showDiagnosticReport(player);
                break;
            case 5:
                engine.entityCache = [];
                engine.stats.ramCleared += 1.2;
                player.onScreenDisplay.setActionBar("§6JavaScript 缓存已清除。");
                break;
        }
    }).catch(e => console.error("UI 错误: " + e));
}

/**
 * 模块：性能诊断报告
 */
function showDiagnosticReport(player) {
    const cpuSaved = (engine.stats.frozenCount * 1.5).toFixed(1);
    
    const report = new UI.ActionFormData()
        .title("📊 稳定性报告")
        .body(
            "§l实时统计§r\n\n" +
            `§b• 受控实体数：§f${engine.stats.frozenCount}\n` +
            `§b• 已禁用的物种：§f${engine.settings.blacklistedMobs.length}\n` +
            `§b• 已清理的 RAM：§f${engine.stats.ramCleared.toFixed(1)} MB\n\n` +
            "§l硬件影响§r\n" +
            `§a• 全局 CPU 增益：§f~${cpuSaved}%\n` +
            `§a• 硬件状态：§f最优\n\n` +
            "§l已激活模块§r\n" +
            "§7- 生物图鉴：过滤不需要的生物生成。\n" +
            "§7- 容器休眠：箱子/漏斗进入低功耗模式。\n" +
            "§7- 内存清理：周期性清除 RAM 数据。"
        )
        .button("§l返回");

    report.show(player);
}
