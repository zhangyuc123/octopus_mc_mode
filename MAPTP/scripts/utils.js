// ============================================================================
// 工具函数模块 — 经验管理、地标读写、权限判定、倒计时检测
// ============================================================================

import { world, system } from "@minecraft/server";

// ----------------------------------------------------------------
// 经验点数安全读取与写入
// ----------------------------------------------------------------

export function getPlayerXp(player) {
    if (!player || !player.isValid) return 0;
    if (typeof player.getTotalXp === "function") {
        return player.getTotalXp();
    } else if (typeof player.getTotalXP === "function") {
        return player.getTotalXP();
    }
    return 0;
}

export function addPlayerXp(player, amount) {
    if (!player || !player.isValid || amount <= 0) return;
    if (typeof player.addExperience === "function") {
        player.addExperience(amount);
    }
}

/**
 * 安全结算经验：使玩家最终经验值精确达到 targetXp。
 * 原理：targetXp - getPlayerXp(player) 得到差值，仅加正数。
 * 解决 resetLevel 后等待期间赚到的经验不被重复/多退的问题。
 */
export function settlePlayerXp(player, targetXp) {
    if (!player || !player.isValid) return;
    const currentXp = getPlayerXp(player);
    const delta = targetXp - currentXp;
    if (delta > 0) {
        addPlayerXp(player, delta);
    }
}

// ----------------------------------------------------------------
// 基于 Tag 的地标读写器
// ----------------------------------------------------------------

export function getWaypoints(player) {
    if (!player || !player.isValid) return [];
    const tags = player.getTags();
    const points = [];
    
    for (const tag of tags) {
        if (tag.startsWith("tp_wp:")) {
            const content = tag.substring("tp_wp:".length);
            const parts = content.split("|");
            if (parts.length === 5) {
                points.push({
                    name: parts[0],
                    location: { x: parseFloat(parts[1]), y: parseFloat(parts[2]), z: parseFloat(parts[3]) },
                    dimensionId: parts[4]
                });
            }
        }
    }
    return points;
}

export function saveWaypoints(player, pointsList) {
    if (!player || !player.isValid) return;
    
    const currentTags = player.getTags();
    for (const tag of currentTags) {
        if (tag.startsWith("tp_wp:")) {
            player.removeTag(tag);
        }
    }
    
    for (const pt of pointsList) {
        const x = Math.round(pt.location.x * 100) / 100;
        const y = Math.round(pt.location.y * 100) / 100;
        const z = Math.round(pt.location.z * 100) / 100;
        const safeName = pt.name.replace(/\|/g, "");
        
        const tagStr = `tp_wp:${safeName}|${x}|${y}|${z}|${pt.dimensionId}`;
        player.addTag(tagStr);
    }
}

// ----------------------------------------------------------------
// 防移动倒计时检测
// ----------------------------------------------------------------

export function waitForTeleport(player, successCallback, cancelCallback) {
    const startPos = player.location;
    const startDim = player.dimension;
    let ticks = 0;
    const interval = system.runInterval(() => {
        ticks++;
        if (!player.isValid || player.dimension.id !== startDim.id ||
            Math.abs(player.location.x - startPos.x) > 0.5 ||
            Math.abs(player.location.y - startPos.y) > 0.5 ||
            Math.abs(player.location.z - startPos.z) > 0.5) {
            system.clearRun(interval);
            player.sendMessage("§c检测到移动，传送已取消！");
            player.playSound("note.bass", { volume: 1.0, pitch: 0.5 });
            if (cancelCallback) cancelCallback();
            return;
        }
        if (ticks >= 60) {
            system.clearRun(interval);
            successCallback();
        }
    }, 1);
}

// ----------------------------------------------------------------
// OP 权限判定
// ----------------------------------------------------------------

export async function checkIsAdmin(player) {
    if (!player || !player.isValid) return false;
    if (player.hasTag("admin")) return true;
    try {
        await player.runCommandAsync("tag @s list");
        return true;
    } catch (e) {
        return false;
    }
}
