// ============================================================================
// UI 模块 — 管理员控制面板
// ============================================================================

import { system } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { getConfig, setConfig } from "./config.js";
import { openMainMenu } from "./ui_menu.js";

export function openAdminMenu(player) {
    const form = new ModalFormData();
    form.title("§l§c--- 管理员控制面板 ---");

    form.toggle("§e▶ 是否全局启用传送系统", { defaultValue: !!getConfig("tp_sys_enabled", true) });
    form.toggle("§a▶ 是否启用经验扣减功能", { defaultValue: !!getConfig("tp_xp_enabled", true) });
    form.textField("§b▶ 每次传送扣减经验值 (点数)", "默认: 200", { defaultValue: String(getConfig("tp_xp_cost_tp", 200)) });
    form.textField("§d▶ 创建地标扣减经验值 (点数)", "默认: 100", { defaultValue: String(getConfig("tp_xp_cost_wp", 100)) });

    form.show(player).then(res => {
        if (res.canceled) {
            system.runTimeout(() => openMainMenu(player, 0, true), 2);
            return;
        }

        const sysEnabled = res.formValues[0];
        const xpEnabled = res.formValues[1];
        let costTp = parseInt(res.formValues[2]);
        let costWp = parseInt(res.formValues[3]);

        if (isNaN(costTp) || costTp < 0) costTp = 200;
        if (isNaN(costWp) || costWp < 0) costWp = 100;

        setConfig("tp_sys_enabled", sysEnabled);
        setConfig("tp_xp_enabled", xpEnabled);
        setConfig("tp_xp_cost_tp", costTp);
        setConfig("tp_xp_cost_wp", costWp);

        player.sendMessage("§a[系统] 管理员设置已成功保存并实时生效！");
        player.playSound("random.levelup", { volume: 0.5, pitch: 1.0 });
        system.runTimeout(() => openMainMenu(player, 0, true), 2);
    });
}
