// Copyright (c) 2025 Dipcoin LLC
// SPDX-License-Identifier: Apache-2.0

import { Keypair } from "@mysten/sui/cryptography";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { SuiClient, TxExecutionResult, getObjectJson } from "./client";
import {
  buildWithdrawTx,
  buildAddMarginTx,
  buildRemoveMarginTx,
  buildSetSubAccountTx,
  getPackageId,
  getProtocolConfigId,
  getBankId,
  getTxIndexerId,
  getCurrencyType,
  getPerpetualId,
  getPriceOracleObjectId,
} from "./transaction-builder";
import { signAndExecuteTransactionWithFreshGas } from "./gas";

export async function executeTxBlock(
  suiClient: SuiClient,
  tx: Transaction,
  signer: Keypair
): Promise<TxExecutionResult> {
  return signAndExecuteTransactionWithFreshGas(suiClient, tx, signer);
}

export function getDeploymentPerpetualID(deployment: any, market?: string): string {
  return getPerpetualId(deployment, market);
}

export async function getOraclePrice(
  suiClient: SuiClient,
  deployment: any,
  market: string
): Promise<number> {
  const objId = getPriceOracleObjectId(deployment, market);
  const json = await getObjectJson(suiClient, objId);
  const price = json?.price_info?.price_feed?.price;
  if (!price?.price || !price?.expo) throw new Error(`Failed to read oracle price for ${market}`);
  return Number(price.price.magnitude) / Math.pow(10, Number(price.expo.magnitude));
}

export async function depositToBank(
  suiClient: SuiClient,
  deployment: any,
  args: { amount: string; accountAddress?: string; bankID?: string; gasBudget?: number },
  signer: Keypair
): Promise<TxExecutionResult> {
  const sender = signer.getPublicKey().toSuiAddress();
  const coinType = getCurrencyType(deployment);

  const tx = new Transaction();
  if (args.gasBudget) tx.setGasBudget(args.gasBudget);
  tx.setSender(sender);

  // Let the SDK select/merge/split the user's USDC (coin objects or address balance)
  const depositCoin = coinWithBalance({ type: coinType, balance: BigInt(args.amount) });

  const packageId = getPackageId(deployment);
  tx.moveCall({
    target: `${packageId}::bank::deposit_v2`,
    arguments: [
      tx.object(getProtocolConfigId(deployment)),
      tx.object(args.bankID || getBankId(deployment)),
      tx.object(getTxIndexerId(deployment)),
      tx.pure.address(args.accountAddress || sender),
      tx.pure.u64(args.amount),
      depositCoin,
    ],
    typeArguments: [coinType],
  });

  return executeTxBlock(suiClient, tx, signer);
}

export async function withdrawFromBank(
  suiClient: SuiClient,
  deployment: any,
  args: { amount: string; accountAddress?: string; bankID?: string; gasBudget?: number },
  signer: Keypair
): Promise<TxExecutionResult> {
  const tx = buildWithdrawTx(
    deployment,
    args,
    undefined,
    args.gasBudget,
    signer.getPublicKey().toSuiAddress()
  );
  return executeTxBlock(suiClient, tx, signer);
}

export async function addMargin(
  suiClient: SuiClient,
  deployment: any,
  args: {
    amount: number | string;
    account?: string;
    perpID?: string;
    subAccountsMapID?: string;
    market?: string;
    gasBudget?: number;
  },
  signer: Keypair
): Promise<TxExecutionResult> {
  const tx = buildAddMarginTx(
    deployment,
    args,
    undefined,
    args.gasBudget,
    signer.getPublicKey().toSuiAddress()
  );
  return executeTxBlock(suiClient, tx, signer);
}

export async function removeMargin(
  suiClient: SuiClient,
  deployment: any,
  args: {
    amount: number | string;
    account?: string;
    perpID?: string;
    subAccountsMapID?: string;
    market?: string;
    gasBudget?: number;
  },
  signer: Keypair
): Promise<TxExecutionResult> {
  const tx = buildRemoveMarginTx(
    deployment,
    args,
    undefined,
    args.gasBudget,
    signer.getPublicKey().toSuiAddress()
  );
  return executeTxBlock(suiClient, tx, signer);
}

export async function setSubAccount(
  suiClient: SuiClient,
  deployment: any,
  args: { account: string; status: boolean; subAccountsMapID?: string; gasBudget?: number },
  signer: Keypair
): Promise<TxExecutionResult> {
  const tx = buildSetSubAccountTx(
    deployment,
    args,
    undefined,
    args.gasBudget,
    signer.getPublicKey().toSuiAddress()
  );
  return executeTxBlock(suiClient, tx, signer);
}
