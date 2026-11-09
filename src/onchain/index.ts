// Copyright (c) 2025 Dipcoin LLC
// SPDX-License-Identifier: Apache-2.0

export { getOrderMessageForUIWallet } from "./order-signer";
export type { Order } from "./order-signer";

export {
  buildAddMarginTx,
  buildRemoveMarginTx,
  buildDepositTx,
  buildWithdrawTx,
  buildSetSubAccountTx,
  buildSetOraclePriceTx,
  buildBatchSetOraclePriceTx,
  getPerpetualId,
  getPriceOracleObjectId,
} from "./transaction-builder";

export {
  executeTxBlock,
  getDeploymentPerpetualID,
  getOraclePrice,
  depositToBank,
  withdrawFromBank,
  addMargin,
  removeMargin,
  setSubAccount,
} from "./exchange";
export { signAndExecuteTransactionWithFreshGas } from "./gas";
export {
  createSuiClient,
  getGrpcFullnodeUrl,
  getObjectJson,
  getObjectsJson,
  getDynamicFieldJson,
  toTxExecutionResult,
  formatExecutionError,
} from "./client";
export type { SuiClient, TxExecutionResult } from "./client";
