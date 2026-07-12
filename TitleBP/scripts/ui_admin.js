// ============================================================================
// UI 模块 — 管理员播报配置（进退播报 / 死亡播报 / 路由菜单）
// ============================================================================

import { world } from "@minecraft/server";
import { ModalFormData, ActionFormData } from "@minecraft/server-ui";
import { DEATH_CAUSES, DEFAULT_JOIN_MSG, DEFAULT_LEAVE_MSG } from "./constants.js";
import { getJoinFormat, getLeaveFormat, getDeathFormat } from "./dynamic_props.js";
import { handleFormBusyRetry } from "./utils.js";

// --- 进退播报配置 ---

export function tryOpenJoinLeaveConfigWindow(player, attempts = 0) {
    if (!player?.isValid || attempts > 30) return;

    const form = new ModalFormData();
    form.title("§l§a---进服/退服播报配置---");
    form.textField(
        "§e▶ 进服播报格式\n§7(请使用 {player} 代替玩家名)",
        "例如: 欢迎 {player}",
        { defaultValue: getJoinFormat() }
    );
    form.textField(
        "§e▶ 退服播报格式\n§7(请使用 {player} 代替玩家名)",
        "例如: {player} 溜了",
        { defaultValue: getLeaveFormat() }
    );

    const startTime = Date.now();
    form.show(player).then((res) => {
        if (res.canceled) {
            if (handleFormBusyRetry(player, attempts, startTime, res.cancelationReason,
                (a) => tryOpenJoinLeaveConfigWindow(player, a))) return;
            return;
        }
        world.setDynamicProperty("crra_join_format",  res.formValues[0]?.trim() || DEFAULT_JOIN_MSG);
        world.setDynamicProperty("crra_leave_format", res.formValues[1]?.trim() || DEFAULT_LEAVE_MSG);
        player.sendMessage("§a[系统] 进退游戏播报配置已成功保存！");
        player.playSound("random.levelup", { volume: 0.5, pitch: 1.5 });
    });
}

// --- 死亡播报配置 ---

export function tryOpenDeathConfigWindow(player, attempts = 0) {
    if (!player?.isValid || attempts > 30) return;

    const form = new ModalFormData();
    form.title("§l§4---死亡播报配置---");
    DEATH_CAUSES.forEach(causeInfo => {
        const hint = causeInfo.key.endsWith("_player")
            ? "§7({player} 玩家, {killer} 凶手, {weapon} 武器短语, {weapon_name} 武器名)"
            : "§7({player} 玩家, {killer} 凶手)";
        form.textField(
            `§e▶ ${causeInfo.name}播报\n${hint}`,
            "自定义该死法播报",
            { defaultValue: getDeathFormat(causeInfo.key) }
        );
    });

    const startTime = Date.now();
    form.show(player).then((res) => {
        if (res.canceled) {
            if (handleFormBusyRetry(player, attempts, startTime, res.cancelationReason,
                (a) => tryOpenDeathConfigWindow(player, a))) return;
            return;
        }
        DEATH_CAUSES.forEach((causeInfo, index) => {
            world.setDynamicProperty(
                `crra_death_${causeInfo.key}`,
                res.formValues[index]?.trim() || causeInfo.default
            );
        });
        player.sendMessage("§a[系统] 死亡播报配置已成功保存！");
        player.playSound("random.levelup", { volume: 0.5, pitch: 1.5 });
    });
}

// --- 播报路由菜单 ---

export function openAdminBroadcastMenu(player, attempts = 0) {
    if (!player?.isValid || attempts > 30) return;

    const form = new ActionFormData();
    form.title("§l§c---全局播报配置---");
    form.button("§a▶ 进服/退服播报配置\n§8修改加入与离开提示");
    form.button("§4▶ 死亡播报配置\n§8修改所有死亡方式提示");

    const startTime = Date.now();
    form.show(player).then((res) => {
        if (res.canceled) {
            if (handleFormBusyRetry(player, attempts, startTime, res.cancelationReason,
                (a) => openAdminBroadcastMenu(player, a))) return;
            return;
        }
        if (res.selection === 0) tryOpenJoinLeaveConfigWindow(player, 0);
        if (res.selection === 1) tryOpenDeathConfigWindow(player, 0);
    });
}
