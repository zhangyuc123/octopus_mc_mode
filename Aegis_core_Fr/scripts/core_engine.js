import { world, system } from "@minecraft/server";
import { updateMonitor } from "./ui_monitor.js";

class AegisEngine {
    constructor() {
        this.settings = { 
            culling: true, 
            itemPurge: false, 
            occlusion: true,
            tileHibernation: true,
            memorySweep: true,
            blacklistedMobs: this.loadBlacklist() // 启动时加载黑名单
        };
        this.stats = { frozenCount: 0, totalOptimized: 0, ramCleared: 0 };
        this.lastTick = Date.now();
        this.entityCache = [];
        this.cacheIndex = 0;
        
        this.startLoop();
        this.initGarbageCollector();
        this.setupSpawnInterceptor();
    }

    /**
     * 模块：黑名单持久化保存
     * 确保退出/重进后仍能记住已禁用的生物
     */
    saveBlacklist() {
        const data = JSON.stringify(this.settings.blacklistedMobs);
        world.setDynamicProperty("aegis:blacklist", data);
    }

    loadBlacklist() {
        try {
            const saved = world.getDynamicProperty("aegis:blacklist");
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    }

    /**
     * 模块：生成拦截器
     */
    setupSpawnInterceptor() {
        world.afterEvents.entitySpawn.subscribe((event) => {
            const { entity } = event;
            if (!entity?.isValid()) return;

            if (this.settings.blacklistedMobs.includes(entity.typeId)) {
                system.run(() => {
                    try {
                        if (entity.isValid()) entity.remove();
                    } catch (e) {}
                });
            }
        });
    }

    startLoop() {
        system.runInterval(() => {
            const now = Date.now();
            const mspt = now - this.lastTick;
            this.lastTick = now;
            
            const adaptiveFactor = Math.max(1, mspt / 50);
            updateMonitor(adaptiveFactor, mspt, this.stats.frozenCount);

            this.runEngineCycle(mspt);

            if (this.settings.tileHibernation && system.currentTick % 100 === 0) {
                this.manageTileHibernation();
            }
        }, 1);
    }

    initGarbageCollector() {
        system.runInterval(() => {
            if (!this.settings.memorySweep) return;
            this.entityCache = [];
            this.cacheIndex = 0;
            this.stats.ramCleared += 0.5;
        }, 6000); 
    }

    runEngineCycle(mspt) {
        this.runAdvancedCulling();
        // 检测到卡顿（>65ms）时自动清理掉落物
        if (this.settings.itemPurge && mspt > 65 && system.currentTick % 200 === 0) {
            this.purgeItems();
        }
    }

    runAdvancedCulling() {
        const players = world.getAllPlayers();
        if (players.length === 0) return;

        // 每隔一秒刷新实体缓存
        if (system.currentTick % 20 === 0) {
            this.entityCache = world.getDimension("overworld").getEntities({
                excludeTypes: ["minecraft:player", "minecraft:item"],
                excludeTags: ["aegis:ignore", "boss", "npc"]
            });
        }

        const batchSize = 12; 
        const start = this.cacheIndex;
        const end = Math.min(start + batchSize, this.entityCache.length);

        for (let i = start; i < end; i++) {
            const entity = this.entityCache[i];
            if (!entity?.isValid()) continue;

            let shouldBeActive = false;
            for (const p of players) {
                const dist = this.getFastDistance(entity.location, p.location);
                if (dist < 48) {
                    // 遮挡剔除：被墙体遮挡且距离 > 16 => 冻结
                    if (this.settings.occlusion && dist > 16) {
                        const viewBlock = entity.dimension.getBlockFromRay(p.getHeadLocation(), p.getViewDirection(), { maxDistance: dist });
                        if (!viewBlock) shouldBeActive = true; 
                    } else {
                        shouldBeActive = true;
                    }
                }
                if (shouldBeActive) break;
            }
            this.applyState(entity, shouldBeActive);
        }
        this.cacheIndex = (end >= this.entityCache.length) ? 0 : end;
    }

    applyState(entity, active) {
        try {
            if (!active && !entity.hasTag("aegis:frozen")) {
                entity.addTag("aegis:frozen");
                entity.addEffect("slowness", 1000000, { amplifier: 255, showParticles: false });
                entity.addEffect("weakness", 1000000, { amplifier: 255, showParticles: false });
                this.stats.frozenCount++;
                this.stats.totalOptimized++;
            } else if (active && entity.hasTag("aegis:frozen")) {
                entity.removeTag("aegis:frozen");
                entity.removeEffect("slowness");
                entity.removeEffect("weakness");
                this.stats.frozenCount = Math.max(0, this.stats.frozenCount - 1);
            }
        } catch(e) {}
    }

    getFastDistance(loc1, loc2) {
        return Math.abs(loc1.x - loc2.x) + Math.abs(loc1.y - loc2.y) + Math.abs(loc1.z - loc2.z);
    }

    purgeItems() {
        const items = world.getDimension("overworld").getEntities({ type: "minecraft:item" });
        if (items.length > 50) {
            items.forEach(i => { if (i.isValid()) i.remove(); });
        }
    }

    manageTileHibernation() {
        // 可选：未来可在此实现漏斗控制模块
    }
}

export const engine = new AegisEngine();
