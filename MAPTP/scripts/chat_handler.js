// ============================================================================
// 聊天指令拦截模块 — .tp / .ok / .no 命令处理
// ============================================================================

import { world, system } from "@minecraft/server";
import { tpRequests } from "./state.js";
import { getConfig } from "./config.js";
import { checkIsAdmin, getPlayerXp, settlePlayerXp, waitForTeleport } from "./utils.js";
import { openMainMenu } from "./ui_menu.js";

world.beforeEvents.chatSend.subscribe((event) => {
    const player = event.sender;
    const msg = event.message.trim().toLowerCase();

    if (msg === ".tp" || msg === ".ok" || msg === ".no") {
        event.cancel = true;

        system.run(async () => {
            const isOp = await checkIsAdmin(player);
            const sysEnabled = getConfig("tp_sys_enabled", true);

            if (!sysEnabled && !isOp) {
                player.sendMessage("§c传送系统目前已被管理员关闭。");
                return;
            }

            if (msg === ".tp") {
                openMainMenu(player, 0, isOp);
                return;
            }

            if (msg === ".ok") {
                const requestData = tpRequests.get(player.id);

                if (requestData) {
                    const { requester, timeoutId, cost, direction, payer } = requestData;

                    system.clearRun(timeoutId);
                    tpRequests.delete(player.id);

                    if (requester && requester.isValid) {
                        const requesterIsOp = await checkIsAdmin(requester);
                        if (!getConfig("tp_sys_enabled", true) && !requesterIsOp) {
                            player.sendMessage("§c同意失败：传送系统已被关闭。");
                            requester.sendMessage("§c由于管理员全局关闭了传送系统，你的传送申请被迫中断。");
                            return;
                        }

                        // ===== .ok 时扣除经验（发起方 / 目标方）=====
                        let reqOriginalXp = 0;
                        let tgtOriginalXp = 0;
                        if (cost > 0) {
                            if (payer === "requester") {
                                reqOriginalXp = getPlayerXp(requester);
                                if (reqOriginalXp < cost) {
                                    player.sendMessage(`§c${requester.nameTag || requester.name} §c经验不足，无法接受传送。`);
                                    player.playSound("note.bass", { volume: 1.0, pitch: 0.5 });
                                    requester.sendMessage(`§c当前经验不足，无法传送！(需要 ${cost} 点，你目前有 ${reqOriginalXp} 点)`);
                                    requester.playSound("note.bass", { volume: 1.0, pitch: 0.5 });
                                    return;
                                }
                                requester.resetLevel();
                            } else {
                                tgtOriginalXp = getPlayerXp(player);
                                if (tgtOriginalXp < cost) {
                                    player.sendMessage(`§c当前经验不足，无法接受传送！(需要 ${cost} 点，你目前有 ${tgtOriginalXp} 点)`);
                                    player.playSound("note.bass", { volume: 1.0, pitch: 0.5 });
                                    requester.sendMessage(`§c对方经验不足，无法接受传送申请。`);
                                    requester.playSound("note.bass", { volume: 1.0, pitch: 0.5 });
                                    return;
                                }
                                player.resetLevel();
                            }
                        }

                        // 根据方向决定谁移动
                        if (direction === "to_requester") {
                            // 目标方传送到发起方
                            player.sendMessage("§a已接受申请！正在引导传送，请勿移动 3 秒...");
                            player.playSound("random.orb", { volume: 1.0, pitch: 1.5 });
                            requester.sendMessage(`§a${player.nameTag || player.name} §a已同意！正在传送过来...`);
                            requester.playSound("random.orb", { volume: 1.0, pitch: 1.5 });

                            system.run(() => {
                                waitForTeleport(player,
                                    () => {
                                        if (!getConfig("tp_sys_enabled", true) && !requesterIsOp) {
                                            player.sendMessage("§c传送失败：系统在您引导期间已被关闭。");
                                            if (cost > 0 && payer === "target") settlePlayerXp(player, tgtOriginalXp);
                                            return;
                                        }

                                        player.teleport(requester.location, { dimension: requester.dimension });
                                        player.sendMessage("§a传送完毕！");
                                        player.playSound("mob.endermen.portal", { volume: 1.0, pitch: 1.0 });

                                        if (cost > 0) {
                                            if (payer === "requester") {
                                                settlePlayerXp(requester, reqOriginalXp - cost);
                                            } else {
                                                settlePlayerXp(player, tgtOriginalXp - cost);
                                            }
                                        }
                                    },
                                    () => {
                                        if (cost > 0) {
                                            if (payer === "requester") {
                                                settlePlayerXp(requester, reqOriginalXp);
                                                requester.sendMessage("§e传送已被打断，退还全部预扣除经验。");
                                            } else if (payer === "target") {
                                                settlePlayerXp(player, tgtOriginalXp);
                                                player.sendMessage("§e传送已被打断，退还全部预扣除经验。");
                                            }
                                        }
                                    }
                                );
                            });
                        } else {
                            // 发起方传送到目标方（to_target）
                            requester.sendMessage("§a对方已同意！正在引导传送，请勿移动 3 秒...");
                            requester.playSound("random.orb", { volume: 1.0, pitch: 1.5 });

                            player.sendMessage("§a已接受申请。");
                            player.playSound("random.orb", { volume: 1.0, pitch: 1.5 });

                            system.run(() => {
                                waitForTeleport(requester,
                                    () => {
                                        if (!getConfig("tp_sys_enabled", true) && !requesterIsOp) {
                                            requester.sendMessage("§c传送失败：系统在您引导期间已被关闭。");
                                            if (cost > 0 && payer === "requester") settlePlayerXp(requester, reqOriginalXp);
                                            return;
                                        }

                                        requester.teleport(player.location, { dimension: player.dimension });
                                        requester.sendMessage("§a传送完毕！");
                                        requester.playSound("mob.endermen.portal", { volume: 1.0, pitch: 1.0 });
                                        if (cost > 0) {
                                            settlePlayerXp(requester, reqOriginalXp - cost);
                                        }
                                    },
                                    () => {
                                        if (cost > 0) {
                                            settlePlayerXp(requester, reqOriginalXp);
                                            requester.sendMessage("§e传送已被打断，退还全部预扣除经验。");
                                        }
                                    }
                                );
                            });
                        }
                    } else {
                        player.sendMessage("§c申请者已下线。");
                    }
                } else {
                    player.sendMessage("§c暂无对待处理的传送申请。");
                }
                return;
            }

            if (msg === ".no") {
                const requestData = tpRequests.get(player.id);

                if (requestData) {
                    const { requester, timeoutId } = requestData;

                    system.clearRun(timeoutId);
                    tpRequests.delete(player.id);

                    player.sendMessage("§c已拒绝传送申请。");
                    player.playSound("random.click", { volume: 1.0, pitch: 0.8 });

                    if (requester && requester.isValid) {
                        requester.sendMessage(`§c${player.nameTag || player.name} §c已拒绝你的传送申请。`);
                        requester.playSound("note.bass", { volume: 1.0, pitch: 0.6 });
                    }
                } else {
                    player.sendMessage("§c暂无对待处理的传送申请。");
                }
                return;
            }
        });
    }
});
