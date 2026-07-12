import { world, system } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';

// 管理面板统一函数
function showAdminForm(admin) {
    const players = Array.from(world.getPlayers());
    if (players.length === 0) {
        admin.sendMessage('§c当前没有在线玩家。');
        return;
    }

    const playerNames = players.map(p => p.name);

    const form = new ModalFormData()
        .title('管理头顶文字')
        .dropdown('选择目标玩家', playerNames)
        .textField('输入要显示的文字', '在这里输入...');

    form.show(admin).then((response) => {
        if (response.canceled) return;

        const target = players[response.formValues[0]];
        if (!target) {
            admin.sendMessage('§c目标玩家已离线。');
            return;
        }

        const text = response.formValues[1];

        // 1. 立即应用到头顶和聊天栏
        target.nameTag = text;
        target.chatNamePrefix = text;
        target.chatNameSuffix = '';

        // 2. 永久保存到世界存档
        try {
            target.setDynamicProperty('customNameTag', text);
        } catch (e) {
            admin.sendMessage('§c保存名称时出错，但当前显示已更新。');
        }

        target.sendMessage(`§a你的头顶名称已被管理员设置为：${text}`);
        admin.sendMessage(`§a已将 ${target.name} 的头顶名称设置为：${text}`);
    }).catch(() => {
        admin.sendMessage('§c弹出窗口失败，请重试');
    });
}

// 触发方式：管理员命令 /scriptevent crra:admin
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== 'crra:admin') return;

    const admin = event.sourceEntity;
    if (!admin || admin.typeId !== 'minecraft:player') return;

    showAdminForm(admin);
});

// 玩家加入服务器时的处理
world.afterEvents.playerJoin.subscribe((event) => {
    const player = event.player;
    if (!player) return;

    // 给管理员发送功能提示
    if (player.isOp()) {
        player.sendMessage('§e作为管理员，你可以使用 /scriptevent crra:admin 来管理玩家的头顶文字。');
    }

    // 自动加载该玩家之前保存的自定义名称（如果存在）
    try {
        const savedName = player.getDynamicProperty('customNameTag');
        if (savedName) {
            player.nameTag = savedName;
            player.chatNamePrefix = savedName;
            player.sendMessage(`§a你的头顶名称已恢复为：${savedName}`);
        }
    } catch (e) {
        // 读取失败时静默处理
    }
});