// ============================================================================
// 玩家事件模块 — 进出游戏 & 死亡播报
// ============================================================================

import { world, EquipmentSlot } from "@minecraft/server";
import { getJoinFormat, getLeaveFormat, getDeathFormat } from "./dynamic_props.js";
import { playerNamesCache, currentSessionPlayers } from "./player_cache.js";
import { getPlayerDisplayName } from "./utils.js";
import { CAUSE_BASE_KEY, SUFFIXED_CAUSES, MOB_TRANSLATIONS, PVP_WEAPON_NAMES } from "./constants.js";

// --- 玩家重生（含首次进服） ---

world.afterEvents.playerSpawn.subscribe((event) => {
    try {
        const player = event.player;
        if (!player?.isValid) return;

        const displayName = getPlayerDisplayName(player);
        player.nameTag = displayName;
        playerNamesCache.set(player.name, displayName);

        if (!currentSessionPlayers.has(player.name)) {
            currentSessionPlayers.add(player.name);
            world.sendMessage(getJoinFormat().replace(/{player}/g, displayName));
        }
    } catch (e) {
        console.warn(`[CRRA] playerSpawn error: ${e?.stack || e}`);
    }
});

// --- 玩家离开 ---

world.afterEvents.playerLeave.subscribe((event) => {
    try {
        const realName = event.playerName;
        currentSessionPlayers.delete(realName);
        const displayName = playerNamesCache.get(realName) || realName;
        world.sendMessage(getLeaveFormat().replace(/{player}/g, displayName));
        playerNamesCache.delete(realName);
    } catch (e) {
        console.warn(`[CRRA] playerLeave error: ${e?.stack || e}`);
    }
});

// --- 实体死亡 ---

world.afterEvents.entityDie.subscribe((event) => {
    try {
        if (event.deadEntity?.typeId !== "minecraft:player") return;

        const player      = event.deadEntity;
        const displayName = player.nameTag || player.name;
        const source      = event.damageSource;
        const cause       = source.cause;

        // 解析杀手名称
        let killerName     = "神秘力量";
        let isPlayerKiller = false;
        let weaponName     = "";

        if (source.damagingEntity) {
            const killer = source.damagingEntity;
            if (killer.typeId === "minecraft:player") {
                killerName     = killer.nameTag || killer.name;
                isPlayerKiller = true;

                // 检测击杀者手持武器
                const equippable = killer.getComponent("equippable");
                const mainHand   = equippable?.getEquipment(EquipmentSlot.Mainhand);
                weaponName = mainHand
                    ? (mainHand.nameTag || PVP_WEAPON_NAMES[mainHand.typeId] || mainHand.typeId.replace("minecraft:", "").replace(/_/g, " "))
                    : "空蹄";
            } else {
                killerName = killer.nameTag
                          || MOB_TRANSLATIONS[killer.typeId]
                          || killer.typeId.replace("minecraft:", "");
            }
        }

        // O(1) 查表 → 死法 key
        const baseKey  = CAUSE_BASE_KEY[cause] || "default";
        const suffix   = isPlayerKiller ? "_player" : "_mob";
        // contact 伤害如推入仙人掌：有玩家击杀者时切换为 contact_player 以显示杀手和武器
        let causeKey = SUFFIXED_CAUSES.has(cause) ? baseKey + suffix : baseKey;
        if (cause === "contact" && isPlayerKiller) {
            causeKey = "contact_player";
        }

        // 构建武器短语：PvP 击杀时嵌入叙事文本，非 PvP 则为空
        let weaponInfo = "";
        if (isPlayerKiller && weaponName) {
            if (cause === "entityAttack" || cause === "contact") {
                weaponInfo = weaponName === "空蹄" ? "一蹄" : `使用武器【§f${weaponName}§7】`;
            } else if (cause === "projectile") {
                weaponInfo = weaponName === "空蹄" ? "一蹄" : `掏出【§f${weaponName}§7】`;
            }
        }

        // 统一走动态属性读参（管理员可自定义），替换所有占位符
        let deathMessage = getDeathFormat(causeKey)
            .replace(/{player}/g,      displayName)
            .replace(/{killer}/g,      killerName)
            .replace(/{weapon}/g,      weaponInfo)
            .replace(/{weapon_name}/g, weaponName);

        world.sendMessage(`§8[§c☠§8] ${deathMessage}`);
    } catch (e) {
        console.warn(`[CRRA] entityDie error: ${e?.stack || e}`);
    }
});
