// ============================================================================
// UI 模块 — 传送点管理（主页 / 新建 / 传送确认 / 删除确认）
// ============================================================================

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { getConfig } from "./config.js";
import { getPlayerXp, addPlayerXp, getWaypoints, saveWaypoints, waitForTeleport } from "./utils.js";
import { openMainMenu } from "./ui_menu.js";

// ----------------------------------------------------------------
// 传送点管理主页
// ----------------------------------------------------------------

export function openWaypointsMenu(player, isOp = false) {
    if (!getConfig("tp_sys_enabled", true) && !isOp) {
        player.sendMessage("§c传送系统目前已被管理员关闭。");
        return;
    }

    const form = new ActionFormData();
    form.title("§l§a--- 传送点管理 ---");

    form.button("§b[<=] 返回主菜单");
    form.button("§e[+] 新建当前位置传送点");

    const points = getWaypoints(player);
    for (const pt of points) {
        form.button(`§b▶ ${pt.name}\n§f点击：进入管理菜单`);
    }

    form.show(player).then(res => {
        if (res.canceled) return;

        if (res.selection === 0) {
            system.runTimeout(() => openMainMenu(player, 0, isOp), 2);
        } else if (res.selection === 1) {
            system.runTimeout(() => openCreateWaypointForm(player, isOp), 2);
        } else {
            const selectedIndex = res.selection - 2;
            system.runTimeout(() => openWaypointActionMenu(player, points, selectedIndex, isOp), 2);
        }
    });
}

// ----------------------------------------------------------------
// 新建地标
// ----------------------------------------------------------------

function openCreateWaypointForm(player, isOp = false) {
    if (!getConfig("tp_sys_enabled", true) && !isOp) {
        player.sendMessage("§c传送系统目前已被管理员关闭。");
        return;
    }

    const form = new ModalFormData();
    form.title("§l§e--- 新建地标 ---");

    const xpEnabled = getConfig("tp_xp_enabled", true);
    const costWp = getConfig("tp_xp_cost_wp", 100);

    form.textField(`§e请输入传送点名字：\n${xpEnabled ? `§c注意: 创建将扣除 ${costWp} 点经验值` : ""}`, "如：ponytown");

    form.show(player).then(res => {
        if (res.canceled) {
            system.runTimeout(() => openWaypointsMenu(player, isOp), 2);
            return;
        }

        if (!getConfig("tp_sys_enabled", true) && !isOp) {
            player.sendMessage("§c核心错误：传送系统已被管理员全局关闭！无法记录新地标。");
            return;
        }

        system.run(() => {
            let ptName = res.formValues[0]?.trim();
            if (!ptName) {
                player.sendMessage("§c名字不能为空！");
                return;
            }
            ptName = ptName.replace(/\|/g, "");

            const points = getWaypoints(player);
            if (points.some(p => p.name === ptName)) {
                player.sendMessage("§c已存在同名传送点，创建失败！");
                return;
            }

            if (xpEnabled) {
                const originalXp = getPlayerXp(player);
                if (originalXp < costWp) {
                    player.sendMessage(`§c经验值不足，无法创建传送点！(需要 ${costWp} 点，你目前有 ${originalXp} 点)`);
                    player.playSound("note.bass", { volume: 1.0, pitch: 0.5 });
                    return;
                }
                player.resetLevel();
                addPlayerXp(player, originalXp - costWp);
            }

            points.push({
                name: ptName,
                location: { x: player.location.x, y: player.location.y, z: player.location.z },
                dimensionId: player.dimension.id
            });

            saveWaypoints(player, points);
            player.sendMessage(`§a传送点 [${ptName}] 已成功记录！${xpEnabled ? `(扣除 ${costWp} 经验值)` : ""}`);
            player.playSound("random.levelup", { volume: 0.5, pitch: 1.0 });

            system.runTimeout(() => openWaypointsMenu(player, isOp), 2);
        });
    });
}

// ----------------------------------------------------------------
// 地标传送确认菜单
// ----------------------------------------------------------------

function openWaypointActionMenu(player, points, index, isOp = false) {
    if (!getConfig("tp_sys_enabled", true) && !isOp) {
        player.sendMessage("§c传送系统目前已被管理员关闭。");
        return;
    }

    const pt = points[index];
    const form = new ActionFormData();

    const xpEnabled = getConfig("tp_xp_enabled", true);
    const costTp = getConfig("tp_xp_cost_tp", 200);

    form.title(`§l§b地标: ${pt.name}`);

    form.button("§b[<=] 返回上一级");
    form.button(`§a▶ 确认传送 (需等待3秒)\n${xpEnabled ? `§c将扣除 ${costTp} 经验点数` : ""}`);
    form.button("§c[X] 删除此传送点");

    form.show(player).then(res => {
        if (res.canceled) return;

        system.run(() => {
            if (res.selection === 0) {
                system.runTimeout(() => openWaypointsMenu(player, isOp), 2);
            } else if (res.selection === 1) {
                if (!getConfig("tp_sys_enabled", true) && !isOp) {
                    player.sendMessage("§c核心错误：传送系统已被管理员全局关闭！地标传送被迫终止。");
                    return;
                }

                let originalXp = 0;
                if (xpEnabled) {
                    originalXp = getPlayerXp(player);
                    if (originalXp < costTp) {
                        player.sendMessage(`§c当前经验不足，无法启动地标传送！(需要 ${costTp} 点，你当前有 ${originalXp} 点)`);
                        player.playSound("note.bass", { volume: 1.0, pitch: 0.5 });
                        return;
                    }
                    player.resetLevel();
                }

                player.sendMessage(`§e正在引导传送至 [${pt.name}]，请勿移动 3 秒...`);
                player.playSound("random.orb", { volume: 1.0, pitch: 1.5 });

                try {
                    const targetDim = world.getDimension(pt.dimensionId);
                    waitForTeleport(player,
                        () => {
                            if (!getConfig("tp_sys_enabled", true) && !isOp) {
                                player.sendMessage("§c传送被打断：系统在您引导期间已被管理员全局锁定。");
                                if (xpEnabled) addPlayerXp(player, originalXp);
                                return;
                            }

                            player.teleport(pt.location, { dimension: targetDim });
                            player.sendMessage(`§a传送成功！已到达 [${pt.name}]。`);
                            player.playSound("mob.endermen.portal", { volume: 1.0, pitch: 1.0 });
                            if (xpEnabled) {
                                addPlayerXp(player, originalXp - costTp);
                            }
                        },
                        () => {
                            if (xpEnabled) {
                                addPlayerXp(player, originalXp);
                                player.sendMessage("§e已原数退还您被扣除的所有经验值。");
                            }
                        }
                    );
                } catch (e) {
                    player.sendMessage("§c传送失败：找不到对应的维度。");
                    if (xpEnabled) addPlayerXp(player, originalXp);
                }
            } else if (res.selection === 2) {
                system.runTimeout(() => openDeleteConfirmMenu(player, points, index, isOp), 2);
            }
        });
    });
}

// ----------------------------------------------------------------
// 地标删除确认
// ----------------------------------------------------------------

function openDeleteConfirmMenu(player, points, index, isOp = false) {
    const pt = points[index];
    const form = new ActionFormData();
    form.title("§l§c--- 确认删除 ---");
    form.body(`§e您确定要永久删除传送点 §b[${pt.name}] §e吗？\n\n§c注意：此操作不可撤销！`);

    form.button("§b[<=] 暂不删除 (返回)");
    form.button("§c[X] 我确定，永久删除");

    form.show(player).then(res => {
        if (res.canceled) return;

        if (res.selection === 0) {
            system.runTimeout(() => openWaypointActionMenu(player, points, index, isOp), 2);
        } else if (res.selection === 1) {
            const delName = points[index].name;
            points.splice(index, 1);
            saveWaypoints(player, points);

            player.sendMessage(`§c已成功永久删除传送点 [${delName}]。`);
            player.playSound("random.break", { volume: 0.5, pitch: 1.0 });

            system.runTimeout(() => openWaypointsMenu(player, isOp), 2);
        }
    });
}
