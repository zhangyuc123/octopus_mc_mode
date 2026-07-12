// ============================================================================
// 聊天指令模块 — .crra 拦截与自定义聊天格式
// ============================================================================

import { world, system } from "@minecraft/server";
import { openMainMenu } from "./ui_menu.js";

world.beforeEvents.chatSend.subscribe((event) => {
    try {
        const player = event.sender;
        const msg    = event.message.trim();

        if (msg.toLowerCase() === ".crra") {
            event.cancel = true;
            system.run(() => openMainMenu(player, 0));
            return;
        }

        if (msg.startsWith(".")) return;

        event.cancel = true;
        const displayName = player.nameTag || player.name;
        world.sendMessage(`<${displayName}§r> §r${msg}`);
    } catch (e) {
        console.warn(`[CRRA] chatSend error: ${e?.stack || e}`);
    }
});
