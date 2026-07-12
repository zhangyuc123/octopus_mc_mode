// ============================================================================
// 工具函数模块 — 颜色处理、Tag 解析、表单重试
// ============================================================================

import { system } from "@minecraft/server";
import { FormCancelationReason } from "@minecraft/server-ui";

/** 去掉 § 样式代码，返回纯文本 */
export function stripColorCodes(text) {
    return text ? text.replace(/§./g, "") : "";
}

/** 将纯文本按给定配色方案渲染为带 § 的彩色字符串 */
export function applyColorTemplate(rawText, config) {
    if (!rawText) return "";
    if (config.type === "solid") {
        return `${config.codes[0] || "§r"}${rawText}§r`;
    }
    if (config.type === "gradient") {
        const codes = config.codes;
        const len   = rawText.length;
        let result  = "";
        for (let i = 0; i < len; i++) {
            const idx = Math.round((i / (len - 1 || 1)) * (codes.length - 1));
            result += `${codes[idx]}${rawText[i]}`;
        }
        return result + "§r";
    }
    return rawText;
}

/** 从玩家 tag 中解析昵称，无则返回原始玩家名 */
export function getPlayerDisplayName(player) {
    for (const tag of player.getTags()) {
        if (tag.startsWith("crra_nick:")) return tag.substring(10);
    }
    return player.name;
}

/**
 * 统一处理表单 UserBusy 重试。
 * 返回 true 表示已接管（调用方应直接 return），false 表示非 busy，正常继续。
 */
export function handleFormBusyRetry(player, attempts, startTime, reason, retryFn) {
    if (reason === FormCancelationReason.UserBusy || reason === "UserBusy" || (Date.now() - startTime) < 100) {
        if (attempts <= 30) {
            if (attempts === 0) player.sendMessage("§e！ 请手动【关闭聊天栏】以弹出窗口 ！");
            system.runTimeout(() => retryFn(attempts + 1), 10);
        }
        return true;
    }
    return false;
}
