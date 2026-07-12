import { world, system } from "@minecraft/server";

// 循环外的计算变量
let frameCount = 0;
let lastTime = Date.now();
let fps = 20;
let holographicDisplay = null;
let lastUpdateData = ""; 

export function updateMonitor(adaptiveFactor, mspt, frozenCount) {
    // 1. 计算服务器心跳（TPS/FPS）
    frameCount++;
    const now = Date.now();
    if (now - lastTime >= 1000) {
        fps = frameCount; 
        frameCount = 0;
        lastTime = now;
    }

    // 2. 格式化数据
    const healthColor = mspt < 45 ? "§a" : (mspt < 75 ? "§6" : "§c");
    const loadText = adaptiveFactor > 1.2 ? `§6过载 x${adaptiveFactor.toFixed(1)}` : "§a稳定";
    
    const currentDataString = `${mspt}-${fps}-${frozenCount}`;

    // 3. 优化后的显示循环
    for (const player of world.getAllPlayers()) {
        if (!player?.isValid()) continue;

        let isHoldingAegis = false;

        // --- 库存错误防护 ---
        try {
            const equippable = player.getComponent("minecraft:equippable");
            const slot = equippable?.getEquipmentSlot("Mainhand");
            
            if (slot && slot.isValid() && slot.hasItem()) { 
                const item = slot.getItem();
                if (item && item.typeId === "minecraft:stick" && item.nameTag === "§bAegis 管理工具§r") {
                    isHoldingAegis = true;
                }
            }
        } catch (e) {
            isHoldingAegis = false;
        }

        if (isHoldingAegis) {
            // 沉浸式 HUD 定位
            const headLoc = player.getHeadLocation();
            const viewDir = player.getViewDirection();
            const pos = {
                x: headLoc.x + viewDir.x * 2.5,
                y: headLoc.y + viewDir.y * 2.5,
                z: headLoc.z + viewDir.z * 2.5
            };
            
            if (!holographicDisplay || !holographicDisplay.isValid()) {
                try {
                    holographicDisplay = player.dimension.spawnEntity("minecraft:text_display", pos);
                } catch(e) {
                    player.onScreenDisplay.setActionBar(`§bAEGIS§f | 刻数：${healthColor}${fps} §7| 冻结：§3${frozenCount}`);
                }
            }

            if (holographicDisplay && holographicDisplay.isValid()) {
                holographicDisplay.teleport(pos, {
                    rotation: { x: player.getRotation().x, y: player.getRotation().y }
                });

                if (lastUpdateData !== currentDataString) {
                    holographicDisplay.nameTag = 
                        `§u§lAEGIS NEXUS v2§r\n` +
                        `§7------------------\n` +
                        `§f延迟：${healthColor}${mspt}ms\n` +
                        `§f稳定性：§f${fps}/20 t/s\n` +
                        `§f优化：§b${frozenCount} AI§r\n` +
                        `§7------------------\n` +
                        `§e硬件状态：${loadText}`;
                    
                    lastUpdateData = currentDataString;
                }
            }
        } else {
            // 不持有时移除全息显示
            if (holographicDisplay && holographicDisplay.isValid()) {
                holographicDisplay.remove();
                holographicDisplay = null;
                lastUpdateData = "";
            }
        }
    }
}
