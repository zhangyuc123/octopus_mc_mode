# TP System Plugin — 模块说明

> 传送与家园点系统插件，基于 `@minecraft/server` 和 `@minecraft/server-ui`。
> 依赖版本：`@minecraft/server@2.8.0-beta`、`@minecraft/server-ui@2.1.0-beta`
> 最低引擎：`1.26.20`

---

## 文件结构

```
scripts/
├── index.js          # 入口文件（仅 import）
├── state.js          # 全局状态（tpRequests Map）
├── config.js         # 世界持久化配置读写
├── utils.js          # 工具函数集
├── send_request.js   # 传送请求发送与超时管理
├── ui_menu.js        # 主菜单 UI
├── ui_player_tp.js   # 玩家互传 UI（方向/付费方选择）
├── ui_waypoint.js    # 地标管理 UI（新建/传送/删除）
├── ui_admin.js       # 管理员控制面板 UI
└── chat_handler.js   # 聊天命令拦截（.tp / .ok / .no）
```

---

## 各模块详述

### `index.js` — 入口文件

仅包含 import 语句，按依赖顺序加载所有模块。`chat_handler.js` 必须最后导入，因为它包含 `world.beforeEvents.chatSend.subscribe(...)` 这个事件订阅副作用。

### `state.js` — 全局状态模块

导出 `tpRequests`（`Map` 类型），以目标玩家 ID 为键存储传送请求数据：

| 字段 | 类型 | 说明 |
|------|------|------|
| `requester` | `Player` | 发起传送请求的玩家 |
| `timeoutId` | `number` | 超时定时器 ID（`system.runTimeout` 返回值） |
| `cost` | `number` | 本次传送消耗的经验点数 |
| `originalXp` | `number` | 发起方被扣前的总经验（仅在 `payer=requester` 时有意义） |
| `direction` | `string` | `"to_target"` 发起方传送到目标方 / `"to_requester"` 目标方传送到发起方 |
| `payer` | `string` | `"requester"` 发起方买单 / `"target"` 目标方买单 |
| `requesterDisplayName` | `string` | 发起方的显示名 |
| `targetDisplayName` | `string` | 目标方的显示名 |
| `payerDisplayName` | `string` | 费用承担方的显示名 |

### `config.js` — 配置读写模块

封装 `world.getDynamicProperty` / `world.setDynamicProperty`，提供两个函数：

- **`getConfig(key, defaultValue)`** — 读取世界持久化配置，不存在时返回默认值
- **`setConfig(key, value)`** — 写入世界持久化配置

配置键列表：

| 键 | 默认值 | 用途 |
|----|--------|------|
| `tp_sys_enabled` | `true` | 是否全局启用传送系统 |
| `tp_xp_enabled` | `true` | 是否启用经验扣减 |
| `tp_xp_cost_tp` | `200` | 每次传送扣除的经验点数 |
| `tp_xp_cost_wp` | `100` | 创建地标扣除的经验点数 |

### `utils.js` — 工具函数模块

纯函数集，无副作用，包含六类工具：

- **`getPlayerXp(player)`** — 安全读取玩家总经验值，兼容 `getTotalXp` 与 `getTotalXP` 拼写差异
- **`addPlayerXp(player, amount)`** — 安全给玩家添加经验值
- **`getWaypoints(player)`** — 从玩家 Tag 中解析所有地标数据
- **`saveWaypoints(player, pointsList)`** — 清除旧地标 Tag 并写入新列表
- **`waitForTeleport(player, successCallback, cancelCallback)`** — 倒计时 3 秒（60 tick），检测移动则取消
- **`checkIsAdmin(player)`** — 异步检测玩家是否有 OP 权限（`admin` Tag 或可执行 `tag @s list`）

### `send_request.js` — 传送请求发送模块

核心函数 `sendTpRequest(requester, target, direction, payer)`：

1. 若目标方已有待处理请求——先检查旧请求的发起方是否有暂扣的经验（`payer=requester`），有则全额退还并通知「已被新申请取代」
2. 当 `payer=requester` 时检查并暂扣发起方经验值
3. 设置 120 秒超时定时器（超时后通知双方并退款）
4. 将请求存入 `tpRequests` Map（覆盖旧请求）
5. 通知发起方（含付费方信息）
6. 通知目标方（根据方向显示不同文案）

### `ui_menu.js` — 主菜单 UI

`openMainMenu(player, attempts, isOp)` — 传送系统主入口：

- 按钮 0：「玩家传送菜单」→ 跳转 `ui_player_tp.js`
- 按钮 1：「传送点管理」→ 跳转 `ui_waypoint.js`
- 按钮 2（仅 OP 可见）：「管理员控制面板」→ 跳转 `ui_admin.js`
- 内置 UserBusy 重试机制（最多 30 次）

### `ui_player_tp.js` — 玩家互传 UI

三个嵌套菜单页面：

- **`openPlayerTpMenu(player, isOp)`** — 列出在线玩家（排除自己），选中后跳转方向选择
- **`openTpDirectionMenu(player, target, isOp)`** — 两个方向按钮：
  - 「传送到对方那里」→ 直接发送 `to_target` 请求（发起方默认买单）
  - 「请求对方传送到我这里」→ 跳转付费方选择
- **`openTpPayerForm(player, target, isOp)`** — 选择经验扣除方：
  - 「我买单」→ `payer=requester`
  - 「对方买单」→ `payer=target`

### `ui_waypoint.js` — 地标管理 UI

四个嵌套菜单页面：

- **`openWaypointsMenu(player, isOp)`** — 地标列表主页，可新建或点击已有地标
- **`openCreateWaypointForm(player, isOp)`** — 新建地标表单，检测重名并扣除经验
- **`openWaypointActionMenu(player, points, index, isOp)`** — 单个地标的传送确认/删除入口
- **`openDeleteConfirmMenu(player, points, index, isOp)`** — 删除二次确认

地标数据以 Tag 形式持久化存储（`tp_wp:名字|x|y|z|维度ID`），随玩家跨服携带。

### `ui_admin.js` — 管理员控制面板 UI

`openAdminMenu(player)` — 仅 OP 可访问的 ModalForm：

- 开关：全局传送系统启停
- 开关：经验扣减功能
- 文本输入：传送消耗经验值
- 文本输入：创建地标消耗经验值

### `chat_handler.js` — 聊天命令拦截模块

订阅 `world.beforeEvents.chatSend`，拦截三条命令：

| 命令 | 功能 |
|------|------|
| `.tp` | 打开传送主菜单 |
| `.ok` | 接受当前传送申请 |
| `.no` | 拒绝当前传送申请 |

`.ok` 处理逻辑：

- 校验系统是否启用、发起方是否在线
- 当 `payer=target` 时检查目标方经验是否足够：
  - 不足 → 双方均收到提示（目标方看到具体缺额，发起方看到「对方经验不足」），请求终止
  - 足够 → 暂扣目标方经验
- 根据 `direction` 决定传送方向：
  - `to_target`：发起方静止 3 秒后传送到目标方
  - `to_requester`：目标方静止 3 秒后传送到发起方
- 传送完成后完成最终经验结算

`.no` 处理逻辑：

- 清除请求和超时定时器
- 通知双方
- 若 `payer=requester` 则退还发起方经验

---

## 数据流

```
.tp
  └→ ui_menu.js: openMainMenu()
       ├→ ui_player_tp.js: openPlayerTpMenu()    列出在线玩家
       │    └→ openTpDirectionMenu()             选择方向
       │         ├→ 传送到对方 → send_request.js: sendTpRequest("to_target", "requester")
       │         └→ 请求对方来 → openTpPayerForm()  选择付费方
       │                           └→ sendTpRequest("to_requester", payer)
       │
       ├→ ui_waypoint.js: openWaypointsMenu()     管理地标
       │
       └→ ui_admin.js: openAdminMenu()             管理员设置

.ok / .no
  └→ chat_handler.js: beforeEvents.chatSend
       ├→ state.js: tpRequests.get(player.id)      查询请求
       ├→ utils.js: checkIsAdmin / getPlayerXp     权限与经验检测
       └→ 执行传送 / 拒绝 / 退款
```
