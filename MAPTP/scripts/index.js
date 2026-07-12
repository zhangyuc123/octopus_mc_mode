// ============================================================================
// TP System Plugin — 入口文件
//
// 按依赖顺序导入各模块，触发初始化与事件注册。
// chat_handler 必须最后导入（包含事件订阅副作用）。
// ============================================================================

import "./state.js";          // 全局请求状态 (tpRequests Map)
import "./config.js";          // 动态配置读写
import "./utils.js";           // 工具函数集
import "./send_request.js";    // 传送请求发送
import "./ui_admin.js";        // 管理员控制面板
import "./ui_menu.js";         // 主菜单
import "./ui_player_tp.js";    // 玩家互传菜单
import "./ui_waypoint.js";     // 地标管理
import "./chat_handler.js";    // 聊天命令拦截 (.tp / .ok / .no)
