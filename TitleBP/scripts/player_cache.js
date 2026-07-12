// ============================================================================
// 全局缓存 & 初始化模块
// ============================================================================

import { world, system } from "@minecraft/server";
import { getPlayerDisplayName } from "./utils.js";

/** 玩家名 → 显示名 缓存 */
export const playerNamesCache = new Map();

/** 当前会话已加入的玩家集合 */
export const currentSessionPlayers = new Set();

system.runTimeout(() => {
    // 关闭原版死亡提示，由自定义彩色播报接管
    try {
        world.getDimension("overworld").runCommand("gamerule showdeathmessages false");
    } catch (e) {
        console.warn("[CRRA] 关闭 showdeathmessages 失败:", e);
    }

    for (const player of world.getAllPlayers()) {
        currentSessionPlayers.add(player.name);
        const displayName = getPlayerDisplayName(player);
        player.nameTag = displayName;
        playerNamesCache.set(player.name, displayName);
    }
}, 20);
