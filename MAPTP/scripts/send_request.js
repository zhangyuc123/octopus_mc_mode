// ============================================================================
// 传送请求发送模块 — 构建请求并通知双方
// ============================================================================

import { world, system } from "@minecraft/server";
import { tpRequests } from "./state.js";
import { getConfig } from "./config.js";

export function sendTpRequest(requester, target, direction, payer) {
    system.run(() => {
        // 若目标已有待处理请求：清除旧定时器（请求阶段未扣经验，无需退款）
        if (tpRequests.has(target.id)) {
            system.clearRun(tpRequests.get(target.id).timeoutId);
        }

        const xpEnabled = getConfig("tp_xp_enabled", true);
        const costTp = getConfig("tp_xp_cost_tp", 200);

        // 请求阶段不扣经验，仅在 .ok 时扣除

        const timeoutTicks = 120 * 20;
        const timeoutId = system.runTimeout(() => {
            if (tpRequests.has(target.id)) {
                const req = tpRequests.get(target.id);
                tpRequests.delete(target.id);

                if (target.isValid) {
                    target.sendMessage(`§c${req.requesterDisplayName} §c的传送申请已超时！`);
                }
                if (req.requester && req.requester.isValid) {
                    req.requester.sendMessage(`§c你对 §f${req.targetDisplayName} §c的传送申请已超时！`);
                    req.requester.playSound("note.bass", { volume: 1.0, pitch: 0.6 });
                }
            }
        }, timeoutTicks);

        const rName = requester.nameTag || requester.name;
        const tName = target.nameTag || target.name;
        const payerName = payer === "requester" ? rName : tName;

        tpRequests.set(target.id, {
            requester: requester,
            timeoutId: timeoutId,
            cost: xpEnabled ? costTp : 0,
            direction: direction,
            payer: payer,
            requesterDisplayName: rName,
            targetDisplayName: tName,
            payerDisplayName: payerName
        });

        const payerNote = xpEnabled
            ? `本次消费由 §b${payerName} §r买单！`
            : "本次传送免费。";
        requester.sendMessage(`§a已向 §f${tName} §a发送传送申请！${payerNote}`);
        requester.playSound("random.orb", { volume: 0.5, pitch: 1.2 });

        if (direction === "to_target") {
            target.sendMessage(`§e${rName} §e请求传送到你这里，${payerNote}\n§b输入 §l.ok §r§b接受，输入 §l.no §r§b拒绝。`);
        } else {
            target.sendMessage(`§e${rName} §e请求你传送过去，${payerNote}\n§b输入 §l.ok §r§b接受，输入 §l.no §r§b拒绝。`);
        }
        target.playSound("random.toast", { volume: 1.0, pitch: 1.0 });
    });
}
