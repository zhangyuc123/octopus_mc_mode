// ============================================================================
// 动态属性模块 — 世界持久化配置读写
// ============================================================================

import { world } from "@minecraft/server";
import { DEATH_DEFAULTS, DEFAULT_JOIN_MSG, DEFAULT_LEAVE_MSG } from "./constants.js";

export function getJoinFormat() {
    return world.getDynamicProperty("crra_join_format") ?? DEFAULT_JOIN_MSG;
}

export function getLeaveFormat() {
    return world.getDynamicProperty("crra_leave_format") ?? DEFAULT_LEAVE_MSG;
}

export function getDeathFormat(key) {
    const fallback = DEATH_DEFAULTS.get(key) ?? DEATH_DEFAULTS.get("default");
    return world.getDynamicProperty(`crra_death_${key}`) ?? fallback;
}
