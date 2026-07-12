// ============================================================================
// UI 模块 — 主菜单路由分发
// ============================================================================

import { ActionFormData } from "@minecraft/server-ui";
import { handleFormBusyRetry } from "./utils.js";
import { tryOpenNamingWindow } from "./ui_naming.js";
import { openAdminBroadcastMenu } from "./ui_admin.js";

export function openMainMenu(player, attempts = 0) {
    if (!player?.isValid || attempts > 30) return;

    if (player.hasTag("crraadmin")) {
        const form = new ActionFormData();
        form.title("§l§b---CRRA 管理菜单---");
        form.button("§d▶ 个人昵称定制\n§8修改你的专属名牌");
        form.button("§c▶ 播报配置 (Admin)\n§8修改全服进退与死亡提示");

        const startTime = Date.now();
        form.show(player).then((res) => {
            if (res.canceled) {
                if (handleFormBusyRetry(player, attempts, startTime, res.cancelationReason,
                    (a) => openMainMenu(player, a))) return;
                return;
            }
            if (res.selection === 0) tryOpenNamingWindow(player, 0);
            if (res.selection === 1) openAdminBroadcastMenu(player, 0);
        });
    } else {
        // 普通玩家直接弹出改名
        tryOpenNamingWindow(player, attempts);
    }
}
