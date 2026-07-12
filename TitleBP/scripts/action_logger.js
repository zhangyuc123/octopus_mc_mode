/*
// ============================================================================
// 玩家动作日志模块 — 输出到控制台（可通过 stdout 重定向捕获）
// 独立于现有事件处理，不干扰改名/播报/UI 功能
// ============================================================================

import { world } from "@minecraft/server";
import { getPlayerDisplayName } from "./utils.js";

// --------------- 辅助函数 ---------------

function timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function locStr(loc) {
    return loc ? `(${Math.floor(loc.x)}, ${Math.floor(loc.y)}, ${Math.floor(loc.z)})` : "(?, ?, ?)";
}

function playerLabel(player) {
    const nick = getPlayerDisplayName(player);
    return nick !== player.name ? `${player.name} (${nick})` : player.name;
}

// --------------- 玩家加入 ---------------

world.afterEvents.playerJoin.subscribe((event) => {
    try {
        const p = event.playerName; // playerName 是 string，player 才是 Player 对象
        // 注意：playerJoin 的 event 包含 playerName（string）和 playerId（string）
        // 也可以从 world.getAllPlayers() 获取完整 Player 对象
        const player = event.player;
        const name = typeof p === "string" ? p : (player?.name ?? "?");
        const nick = player ? getPlayerDisplayName(player) : name;
        const label = nick !== name ? `${name} (${nick})` : name;
        console.log(`[${timestamp()}] [JOIN] ${label} 加入了游戏`);
    } catch (e) {
        console.warn(`[ACTION_LOG] playerJoin error: ${e?.stack || e}`);
    }
});

// --------------- 玩家离开 ---------------

world.afterEvents.playerLeave.subscribe((event) => {
    try {
        const name = event.playerName ?? "?";
        console.log(`[${timestamp()}] [LEAVE] ${name} 离开了游戏`);
    } catch (e) {
        console.warn(`[ACTION_LOG] playerLeave error: ${e?.stack || e}`);
    }
});

// --------------- 破坏方块 ---------------

world.afterEvents.playerBreakBlock.subscribe((event) => {
    try {
        const { player, block, brokenBlockPermutation } = event;
        if (!player?.isValid) return;
        const type = brokenBlockPermutation?.type?.id ?? "unknown";
        const loc = block?.location;
        console.log(`[${timestamp()}] [BREAK] ${playerLabel(player)} 破坏了 ${type} 在 ${locStr(loc)}`);
    } catch (e) {
        console.warn(`[ACTION_LOG] playerBreakBlock error: ${e?.stack || e}`);
    }
});

// --------------- 放置方块 ---------------

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    try {
        const { player, block } = event;
        if (!player?.isValid) return;
        const type = block?.typeId ?? "unknown";
        const loc = block?.location;
        console.log(`[${timestamp()}] [PLACE] ${playerLabel(player)} 放置了 ${type} 在 ${locStr(loc)}`);
    } catch (e) {
        console.warn(`[ACTION_LOG] playerPlaceBlock error: ${e?.stack || e}`);
    }
});

// --------------- 击杀生物（玩家击杀任一生物） ---------------

world.afterEvents.entityDie.subscribe((event) => {
    try {
        const { deadEntity, damageSource } = event;
        const killer = damageSource?.damagingEntity;
        // 只记录玩家作为击杀者的情况，玩家被击杀由 player_events.js 播报处理
        if (!killer || killer.typeId !== "minecraft:player" || !killer.isValid) return;
        if (deadEntity?.typeId === "minecraft:player") return; // 玩家互杀不重复记录

        const dead = deadEntity?.typeId ?? "unknown";
        const loc = deadEntity?.location;
        console.log(`[${timestamp()}] [KILL] ${playerLabel(killer)} 击杀了 ${dead} 在 ${locStr(loc)}`);
    } catch (e) {
        console.warn(`[ACTION_LOG] entityDie error: ${e?.stack || e}`);
    }
});
*/
