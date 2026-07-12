// ============================================================================
// UI 模块 — 主菜单入口 (.tp 命令触发)
// ============================================================================

import { system } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";
import { getConfig } from "./config.js";
import { openPlayerTpMenu } from "./ui_player_tp.js";
import { openWaypointsMenu } from "./ui_waypoint.js";
import { openAdminMenu } from "./ui_admin.js";

export function openMainMenu(player, attempts = 0, isOp = false) {
    if (!player || !player.isValid || attempts > 30) return;

    if (!getConfig("tp_sys_enabled", true) && !isOp) {
        player.sendMessage("§c传送系统目前已被管理员关闭。");
        return;
    }

    const form = new ActionFormData();
    form.title("§l§b--- 传送系统主菜单 ---");

    form.button("§e▶ 玩家传送菜单\n§f在线玩家互相传送");
    form.button("§a▶ 我的传送点管理\n§f建立/删除传送点");

    if (isOp) {
        form.button("§c▶ 管理员控制面板\n§f系统设置与经验调整");
    }

    const startTime = Date.now();
    form.show(player).then(res => {
        if (res.canceled) {
            if (res.cancelationReason === "UserBusy" || res.cancelationReason === FormCancelationReason.UserBusy || (Date.now() - startTime) < 100) {
                if (attempts === 0) player.sendMessage("§e！ 请手动【关闭聊天栏】以弹出传送窗口 ！");
                system.runTimeout(() => openMainMenu(player, attempts + 1, isOp), 10);
            }
            return;
        }

        if (res.selection === 0) {
            system.runTimeout(() => openPlayerTpMenu(player, isOp), 2);
        } else if (res.selection === 1) {
            system.runTimeout(() => openWaypointsMenu(player, isOp), 2);
        } else if (res.selection === 2 && isOp) {
            system.runTimeout(() => openAdminMenu(player), 2);
        }
    }).catch(err => console.error(err));
}
