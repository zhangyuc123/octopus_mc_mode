// ============================================================================
// Status Report Addon — 完整版（事件 + 定时状态上报）
// 事件：join / leave / chat / death / block_break / block_place /
//       container_take / container_place / item_use
// 定时：每 60 秒上报一次在线玩家 & TPS
// ============================================================================

import { world, system } from "@minecraft/server";
import { http, HttpRequest, HttpHeader, HttpRequestMethod } from "@minecraft/server-net";

// ================================================================
//  1. 配置（注意 ENABLE_STATUS 已打开）
// ================================================================

const CONFIG = {
    API_BASE_URL: "http://159.75.109.191:8080/api/minecraft",   // 你的 API 地址
    STATUS_INTERVAL_SEC: 60,
    SERVER_ID: "bedrock-server-1",
    ENABLE_STATUS: true,       // ★ 开启定时状态上报
    ENABLE_EVENTS: true,
    REQUEST_TIMEOUT: 5000,
};

// ================================================================
//  2. HTTP 上报（带重试）
// ================================================================

const MAX_RETRIES = 3;
const RETRY_INTERVAL_TICKS = 20;
const pendingQueue = [];

function postJSON(path, data, retriesLeft = MAX_RETRIES) {
    const fullUrl = CONFIG.API_BASE_URL + path;
    try {
        const body = JSON.stringify(data);
        const request = new HttpRequest(fullUrl);
        request.method  = HttpRequestMethod.Post;
        request.body    = body;
        request.headers = [new HttpHeader("Content-Type", "application/json")];
        request.timeout = CONFIG.REQUEST_TIMEOUT;

        http.request(request)
            .then((response) => {
                if (response.status >= 400 && response.status < 500) {
                    console.warn(`[StatusReport] HTTP ${response.status} on POST ${path} — 不重试`);
                } else if (response.status >= 500 || response.status === 0) {
                    scheduleRetry(path, data, retriesLeft, response.status);
                }
            })
            .catch((err) => {
                console.warn(`[StatusReport] 网络异常 POST ${path}: ${err}`);
                scheduleRetry(path, data, retriesLeft, -1);
            });
    } catch (e) {
        const msg = typeof e === "string" ? e : (e?.message || e?.stack || JSON.stringify(e));
        console.warn(`[StatusReport] postJSON 同步异常 POST ${path}: ${msg}`);
        scheduleRetry(path, data, retriesLeft, -1);
    }
}

function scheduleRetry(path, data, retriesLeft, status) {
    if (retriesLeft <= 0) {
        console.warn(`[StatusReport] POST ${path} 重试耗尽，数据已丢弃`);
        return;
    }
    const entry = { path, data, retriesLeft: retriesLeft - 1, status };
    pendingQueue.push(entry);
    system.runTimeout(() => {
        const idx = pendingQueue.indexOf(entry);
        if (idx === -1) return;
        pendingQueue.splice(idx, 1);
        const { path: p, data: d, retriesLeft: r } = entry;
        console.warn(`[StatusReport] POST ${p} 重试… (剩余 ${r} 次)`);
        postJSON(p, d, r);
    }, RETRY_INTERVAL_TICKS);
}

// ================================================================
//  3. 玩家昵称映射（crra_nick 标签）
// ================================================================

const nickCache = new Map();

function getPlayerNick(player) {
    if (!player?.isValid) return "?";
    for (const tag of player.getTags()) {
        if (tag.startsWith("crra_nick:")) {
            const nick = tag.substring(10);
            nickCache.set(player.name, nick);
            return nick;
        }
    }
    nickCache.set(player.name, player.name);
    return player.name;
}

function getCachedNick(rawName) {
    return nickCache.get(rawName) || rawName;
}

// ================================================================
//  4. 容器取放物品快照（仅箱子/木桶/潜影盒）
// ================================================================

const containerSnapshots = new Map();

function isTargetContainer(container) {
    const block = container?.block;
    if (!block) return false;
    const id = block.typeId;
    return id === "minecraft:chest" ||
           id === "minecraft:barrel" ||
           id.startsWith("minecraft:shulker_box");
}

function getContainerKey(container) {
    const b = container.block;
    return `block_${b.x}_${b.y}_${b.z}_${b.dimension?.id ?? "overworld"}`;
}

// ================================================================
//  5. 事件注册
// ================================================================

function registerEventHandlers() {

    // ① 玩家加入
    world.afterEvents.playerSpawn.subscribe((event) => {
        try {
            if (!event.initialSpawn) return;
            const player = event.player;
            if (!player?.isValid) return;
            postJSON("/event", {
                serverId:  CONFIG.SERVER_ID,
                type:      "event",
                eventType: "join",
                timestamp: Date.now(),
                data: {
                    playerName: getPlayerNick(player),
                    playerId:   player.id,
                }
            });
        } catch (e) {
            console.warn(`[StatusReport] playerSpawn 错误: ${e?.stack || e}`);
        }
    });

    // ② 玩家退出
    world.afterEvents.playerLeave.subscribe((event) => {
        try {
            const nick = getCachedNick(event.playerName);
            nickCache.delete(event.playerName);
            postJSON("/event", {
                serverId:  CONFIG.SERVER_ID,
                type:      "event",
                eventType: "leave",
                timestamp: Date.now(),
                data: {
                    playerName: nick,
                }
            });
        } catch (e) {
            console.warn(`[StatusReport] playerLeave 错误: ${e?.stack || e}`);
        }
    });

    // ③ 聊天
    world.beforeEvents.chatSend.subscribe((event) => {
        try {
            const message = event.message.trim();
            if (message.startsWith(".")) return;
            postJSON("/event", {
                serverId:  CONFIG.SERVER_ID,
                type:      "event",
                eventType: "chat",
                timestamp: Date.now(),
                data: {
                    playerName: getPlayerNick(event.sender),
                    playerId:   event.sender.id,
                    message:    message,
                }
            });
        } catch (e) {
            console.warn(`[StatusReport] chatSend 错误: ${e?.stack || e}`);
        }
    });

    // ④ 玩家死亡
    world.afterEvents.entityDie.subscribe((event) => {
        try {
            if (event.deadEntity?.typeId !== "minecraft:player") return;
            const victim = event.deadEntity;
            const source = event.damageSource;
            const cause  = source?.cause || "unknown";

            let killerName = null;
            let killerType = null;
            if (source?.damagingEntity) {
                const killer = source.damagingEntity;
                killerType = killer.typeId;
                if (killer.typeId === "minecraft:player") {
                    killerName = getPlayerNick(killer);
                }
            }

            postJSON("/event", {
                serverId:  CONFIG.SERVER_ID,
                type:      "event",
                eventType: "death",
                timestamp: Date.now(),
                data: {
                    playerName: getPlayerNick(victim),
                    playerId:   victim.id,
                    cause:      cause,
                    killer:     killerName,
                    killerType: killerType,
                }
            });
        } catch (e) {
            console.warn(`[StatusReport] entityDie 错误: ${e?.stack || e}`);
        }
    });

    // ⑤ 破坏方块（含坐标）
    world.afterEvents.playerBreakBlock.subscribe((event) => {
        try {
            const player = event.player;
            if (!player?.isValid) return;
            postJSON("/event", {
                serverId:  CONFIG.SERVER_ID,
                type:      "event",
                eventType: "block_break",
                timestamp: Date.now(),
                data: {
                    playerName: getPlayerNick(player),
                    playerId:   player.id,
                    blockId:    event.block?.typeId || "unknown",
                    location: {
                        x: event.block?.x ?? null,
                        y: event.block?.y ?? null,
                        z: event.block?.z ?? null,
                    },
                }
            });
        } catch (e) {
            console.warn(`[StatusReport] playerBreakBlock 错误: ${e?.stack || e}`);
        }
    });

    // ⑥ 放置方块（含坐标）
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        try {
            const player = event.player;
            if (!player?.isValid) return;
            postJSON("/event", {
                serverId:  CONFIG.SERVER_ID,
                type:      "event",
                eventType: "block_place",
                timestamp: Date.now(),
                data: {
                    playerName: getPlayerNick(player),
                    playerId:   player.id,
                    blockId:    event.block?.typeId || "unknown",
                    location: {
                        x: event.block?.x ?? null,
                        y: event.block?.y ?? null,
                        z: event.block?.z ?? null,
                    },
                }
            });
        } catch (e) {
            console.warn(`[StatusReport] playerPlaceBlock 错误: ${e?.stack || e}`);
        }
    });

    // ⑦ 物品使用
    world.afterEvents.itemUse.subscribe((event) => {
        try {
            const player = event.source;
            if (!player?.isValid || player.typeId !== "minecraft:player") return;
            postJSON("/event", {
                serverId:  CONFIG.SERVER_ID,
                type:      "event",
                eventType: "item_use",
                timestamp: Date.now(),
                data: {
                    playerName: getPlayerNick(player),
                    playerId:   player.id,
                    itemId:     event.itemStack?.typeId || "unknown",
                }
            });
        } catch (e) {
            console.warn(`[StatusReport] itemUse 错误: ${e?.stack || e}`);
        }
    });

    // ⑧ 容器打开（仅箱子/木桶/潜影盒）
    if (world.afterEvents.containerOpen) {
        world.afterEvents.containerOpen.subscribe((event) => {
            try {
                const player = event.player;
                if (!player?.isValid) return;
                if (!isTargetContainer(event.container)) return;

                const container = event.container;
                const key = getContainerKey(container);

                const snapshot = new Map();
                for (let i = 0; i < container.size; i++) {
                    const item = container.getSlot(i);
                    if (item && item.typeId) {
                        snapshot.set(i, { typeId: item.typeId, amount: item.amount });
                    }
                }
                containerSnapshots.set(key, snapshot);

                const block = container.block;
                postJSON("/event", {
                    serverId:  CONFIG.SERVER_ID,
                    type:      "event",
                    eventType: "container_open",
                    timestamp: Date.now(),
                    data: {
                        playerName: getPlayerNick(player),
                        playerId:   player.id,
                        blockId:    block.typeId,
                        location:   { x: block.x, y: block.y, z: block.z },
                    }
                });
            } catch (e) {
                console.warn(`[StatusReport] containerOpen 错误: ${e?.stack || e}`);
            }
        });
    }

    // ⑨ 容器关闭（对比快照，上报取放物品）
    if (world.afterEvents.containerClose) {
        world.afterEvents.containerClose.subscribe((event) => {
            try {
                const player = event.player;
                if (!player?.isValid) return;
                if (!isTargetContainer(event.container)) return;

                const container = event.container;
                const key = getContainerKey(container);
                const snapshot = containerSnapshots.get(key);

                if (snapshot) {
                    const itemsTaken = [];
                    const itemsPlaced = [];

                    for (let i = 0; i < container.size; i++) {
                        const curItem = container.getSlot(i);
                        const prev = snapshot.get(i);
                        const cur = (curItem && curItem.typeId)
                            ? { typeId: curItem.typeId, amount: curItem.amount }
                            : null;

                        if (prev && cur) {
                            if (prev.typeId === cur.typeId) {
                                if (prev.amount > cur.amount) {
                                    itemsTaken.push({ typeId: cur.typeId, amount: prev.amount - cur.amount, slot: i });
                                } else if (prev.amount < cur.amount) {
                                    itemsPlaced.push({ typeId: cur.typeId, amount: cur.amount - prev.amount, slot: i });
                                }
                            } else {
                                itemsTaken.push({ typeId: prev.typeId, amount: prev.amount, slot: i });
                                itemsPlaced.push({ typeId: cur.typeId, amount: cur.amount, slot: i });
                            }
                        } else if (prev && !cur) {
                            itemsTaken.push({ typeId: prev.typeId, amount: prev.amount, slot: i });
                        } else if (!prev && cur) {
                            itemsPlaced.push({ typeId: cur.typeId, amount: cur.amount, slot: i });
                        }
                    }

                    // 上报取出
                    for (const item of itemsTaken) {
                        postJSON("/event", {
                            serverId:  CONFIG.SERVER_ID,
                            type:      "event",
                            eventType: "container_take",
                            timestamp: Date.now(),
                            data: {
                                playerName: getPlayerNick(player),
                                playerId:   player.id,
                                blockId:    container.block.typeId,
                                location: { x: container.block.x, y: container.block.y, z: container.block.z },
                                item:   item.typeId,
                                amount: item.amount,
                                slot:   item.slot,
                            }
                        });
                    }

                    // 上报放入
                    for (const item of itemsPlaced) {
                        postJSON("/event", {
                            serverId:  CONFIG.SERVER_ID,
                            type:      "event",
                            eventType: "container_place",
                            timestamp: Date.now(),
                            data: {
                                playerName: getPlayerNick(player),
                                playerId:   player.id,
                                blockId:    container.block.typeId,
                                location: { x: container.block.x, y: container.block.y, z: container.block.z },
                                item:   item.typeId,
                                amount: item.amount,
                                slot:   item.slot,
                            }
                        });
                    }

                    containerSnapshots.delete(key);
                }

                const block = container.block;
                postJSON("/event", {
                    serverId:  CONFIG.SERVER_ID,
                    type:      "event",
                    eventType: "container_close",
                    timestamp: Date.now(),
                    data: {
                        playerName: getPlayerNick(player),
                        playerId:   player.id,
                        blockId:    block.typeId,
                        location:   { x: block.x, y: block.y, z: block.z },
                    }
                });
            } catch (e) {
                console.warn(`[StatusReport] containerClose 错误: ${e?.stack || e}`);
            }
        });
    }

    console.log("[StatusReport] 事件监听已注册");
}

// ================================================================
//  6. 定时状态上报（重新添加）
// ================================================================

let lastTickTime = 0;
let lastTick     = 0;
let hasBaseline = false;

function startStatusReporter() {
    const intervalTicks = CONFIG.STATUS_INTERVAL_SEC * 20;
    system.runTimeout(() => {
        reportStatus(true);
    }, 20);
    system.runInterval(() => {
        reportStatus(false);
    }, intervalTicks);
    console.log(`[StatusReport] 状态上报已启动 (间隔 ${CONFIG.STATUS_INTERVAL_SEC}s / ${intervalTicks} ticks)`);
}

function reportStatus(firstRun = false) {
    try {
        const now         = Date.now();
        const allPlayers  = world.getAllPlayers();
        const currentTick = system.currentTick;

        let tps = 20.0;
        if (!firstRun && hasBaseline) {
            const timeDelta = (now - lastTickTime) / 1000;
            const tickDelta = currentTick - lastTick;
            tps = timeDelta > 0
                ? Math.round((tickDelta / timeDelta) * 10) / 10
                : 20.0;
        }

        lastTickTime = now;
        lastTick     = currentTick;
        hasBaseline  = true;

        const playerNames = [];
        for (const p of allPlayers) {
            if (p?.isValid) playerNames.push(getPlayerNick(p));
        }

        const payload = {
            serverId:  CONFIG.SERVER_ID,
            type:      "status",
            timestamp: now,
            data: {
                onlinePlayers: playerNames.length,
                playerNames:   playerNames,
                tps:           tps,
                memory:        null,
            }
        };

        postJSON("/status", payload);
    } catch (e) {
        console.warn(`[StatusReport] reportStatus 错误: ${e?.stack || e}`);
    }
}

// ================================================================
//  7. 初始化
// ================================================================

system.runTimeout(() => {
    if (CONFIG.ENABLE_STATUS) {
        startStatusReporter();
    }
    if (CONFIG.ENABLE_EVENTS) {
        registerEventHandlers();
    }
    console.log("[StatusReport] 行为包初始化完成");
}, 20);