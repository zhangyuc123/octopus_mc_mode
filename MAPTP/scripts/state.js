// ============================================================================
// 传送请求状态模块 — 全局共享的 tpRequests Map
// ============================================================================

/**
 * Map<targetPlayerId, {
 *   requester,           // Player - 发起方
 *   timeoutId,           // number - 超时定时器 ID
 *   cost,                // number - 本次消耗经验值
 *   originalXp,          // number - 发起方原始经验值（仅 payer=requester 时有效）
 *   direction,           // "to_target" | "to_requester"
 *   payer,               // "requester" | "target"
 *   requesterDisplayName,// string
 *   targetDisplayName,   // string
 *   payerDisplayName     // string
 * }>
 */
export const tpRequests = new Map();
