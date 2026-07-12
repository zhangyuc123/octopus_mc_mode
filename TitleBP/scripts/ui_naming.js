// ============================================================================
// UI 模块 — 个人昵称改名窗口
// ============================================================================

import { ModalFormData } from "@minecraft/server-ui";
import { COLOR_MENU } from "./constants.js";
import { handleFormBusyRetry, stripColorCodes, applyColorTemplate } from "./utils.js";
import { playerNamesCache } from "./player_cache.js";

export function tryOpenNamingWindow(player, attempts = 0) {
    if (!player?.isValid || attempts > 30) return;

    const cleanDefaultName = stripColorCodes(player.nameTag) || player.name;
    const form = new ModalFormData();
    form.title("§l§b---个人昵称个性化定制---");
    form.textField("§e▶ 请输入新昵称 (勿输入§)", "例如：章鱼小马", { defaultValue: cleanDefaultName });
    form.dropdown("§e▶ 请选择配色", COLOR_MENU.map(item => item.name), { defaultValueIndex: 0 });

    const startTime = Date.now();
    form.show(player).then((res) => {
        if (res.canceled) {
            if (handleFormBusyRetry(player, attempts, startTime, res.cancelationReason,
                (a) => tryOpenNamingWindow(player, a))) return;
            return;
        }
        const rawNameInput = res.formValues[0]?.trim();
        if (!rawNameInput) { player.sendMessage("§c名字不能为空！"); return; }

        const finalName = applyColorTemplate(stripColorCodes(rawNameInput), COLOR_MENU[res.formValues[1] ?? 0]);

        // 清除旧 tag，贴新 tag
        for (const tag of player.getTags()) if (tag.startsWith("crra_nick:")) player.removeTag(tag);
        player.addTag(`crra_nick:${finalName}`);
        player.nameTag = finalName;
        playerNamesCache.set(player.name, finalName);

        player.sendMessage(`§a昵称修改成功！效果: ${finalName}`);
        player.playSound("random.levelup", { volume: 0.5, pitch: 1.5 });
    });
}
