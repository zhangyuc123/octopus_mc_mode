// ============================================================================
// 配置读写模块 — 世界持久化 DynamicProperty 读写
// ============================================================================

import { world } from "@minecraft/server";

export function getConfig(key, defaultValue) {
    const val = world.getDynamicProperty(key);
    return val !== undefined ? val : defaultValue;
}

export function setConfig(key, value) {
    world.setDynamicProperty(key, value);
}
