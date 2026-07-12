// ============================================================================
// UI 模块 — 玩家互传菜单（选目标 → 方向选择 → 付费方选择）
// ============================================================================

import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getConfig } from "./config.js";
import { sendTpRequest } from "./send_request.js";
import { openMainMenu } from "./ui_menu.js";

// ----------------------------------------------------------------
// 玩家列表页面
// ----------------------------------------------------------------

export function openPlayerTpMenu(player, isOp = false) {
    if (!getConfig("tp_sys_enabled", true) && !isOp) {
        player.sendMessage("§c传送系统目前已被管理员关闭。");
        return;
    }

    const otherPlayers = world.getAllPlayers().filter(p => p.id !== player.id);

    const form = new ActionFormData();
    form.title("§l§e--- 玩家传送菜单 ---");

    form.button("§b[<=] 返回主菜单");

    if (otherPlayers.length === 0) {
        form.body("§c当前没有其他在线玩家可以传送。");
    } else {
        for (const p of otherPlayers) {
            form.button(`§e▶ §f${p.nameTag || p.name}`);
        }
    }

    form.show(player).then(res => {
        if (res.canceled) return;

        if (res.selection === 0) {
            system.runTimeout(() => openMainMenu(player, 0, isOp), 2);
            return;
        }

        if (!getConfig("tp_sys_enabled", true) && !isOp) {
            player.sendMessage("§c核心错误：传送系统已被管理员全局关闭！发起的申请已被拦截。");
            return;
        }

        const targetPlayer = otherPlayers[res.selection - 1];
        if (!targetPlayer || !targetPlayer.isValid) {
            player.sendMessage("§c目标玩家已离线！");
            return;
        }

        system.runTimeout(() => openTpDirectionMenu(player, targetPlayer, isOp), 2);
    });
}

// ----------------------------------------------------------------
// 方向选择页面
// ----------------------------------------------------------------

function openTpDirectionMenu(player, targetPlayer, isOp = false) {
    const tName = targetPlayer.nameTag || targetPlayer.name;
    const form = new ActionFormData();
    form.title(`§l§e--- 传送至 ${tName} ---`);
    form.button("§a▶ 传送到对方那里\n§f我 → 对方");
    form.button("§d▶ 请求对方传送到我这里\n§f对方 → 我");
    form.button("§b[<=] 返回玩家列表");

    form.show(player).then(res => {
        if (res.canceled) return;

        if (res.selection === 2) {
            system.runTimeout(() => openPlayerTpMenu(player, isOp), 2);
            return;
        }

        const direction = res.selection === 0 ? "to_target" : "to_requester";
        // 两个方向都弹出付费方选择
        system.runTimeout(() => openTpPayerForm(player, targetPlayer, direction, isOp), 2);
    });
}

// ----------------------------------------------------------------
// 付费方选择页面（to_target 和 to_requester 共用）
// ----------------------------------------------------------------

function openTpPayerForm(player, targetPlayer, direction, isOp = false) {
    const tName = targetPlayer.nameTag || targetPlayer.name;
    const form = new ActionFormData();
    form.title("§l§d--- 选择费用承担方 ---");

    const xpEnabled = getConfig("tp_xp_enabled", true);
    const costTp = getConfig("tp_xp_cost_tp", 200);

    if (xpEnabled) {
        form.body(`§e本次传送将消耗 §c${costTp} §e点经验值\n\n请选择由谁来承担这笔费用：`);
    } else {
        form.body("§e当前经验扣减功能未启用，本次传送免费。");
    }

    const myName = player.nameTag || player.name;
    form.button(`§a▶ 我买单 (${myName})\n§f从我的经验中扣除`);
    form.button(`§b▶ 对方买单 (${tName})\n§f从对方的经验中扣除`);

    form.show(player).then(res => {
        if (res.canceled) {
            system.runTimeout(() => openTpDirectionMenu(player, targetPlayer, isOp), 2);
            return;
        }

        const payer = res.selection === 0 ? "requester" : "target";
        sendTpRequest(player, targetPlayer, direction, payer);
    });
}
