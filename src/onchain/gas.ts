// Copyright (c) 2025 Dipcoin LLC
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from "@mysten/sui/client";
import { Keypair } from "@mysten/sui/cryptography";
import { Transaction, type ObjectRef } from "@mysten/sui/transactions";
import { SuiClient, TX_RESULT_INCLUDE, TxExecutionResult, toTxExecutionResult } from "./client";

const SUI_COIN_TYPE = "0x2::sui::SUI";
const STALE_GAS_RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isStaleObjectVersionError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("Transaction needs to be rebuilt") ||
    message.includes("unavailable for consumption") ||
    message.includes("UnavailableForConsumption") ||
    message.includes("current version:")
  );
}

/**
 * Pick the largest SUI coin object and re-read it so the gas payment uses the
 * latest version/digest. Returns `null` when the wallet holds no SUI coin
 * objects (e.g. all SUI sits in the address balance) so the SDK can select gas.
 */
async function getFreshGasObjectRef(
  suiClient: SuiClient,
  owner: string
): Promise<ObjectRef | null> {
  const coins: SuiClientTypes.Coin[] = [];
  let cursor: string | null = null;

  do {
    const page: SuiClientTypes.ListCoinsResponse = await suiClient.core.listCoins({
      owner,
      coinType: SUI_COIN_TYPE,
      cursor,
    });
    coins.push(...page.objects);
    cursor = page.hasNextPage ? page.cursor : null;
  } while (cursor);

  if (!coins.length) return null;

  const gasCoin = coins.slice().sort((a, b) => {
    const aBalance = BigInt(a.balance);
    const bBalance = BigInt(b.balance);
    if (aBalance === bBalance) return 0;
    return aBalance < bBalance ? 1 : -1;
  })[0];
  const { objects } = await suiClient.core.getObjects({ objectIds: [gasCoin.objectId] });
  const ref = objects[0];
  if (ref instanceof Error || !ref.objectId || !ref.version || !ref.digest) {
    throw new Error(`Failed to refresh gas coin object ref for ${gasCoin.objectId}`);
  }

  return {
    objectId: ref.objectId,
    version: ref.version,
    digest: ref.digest,
  };
}

async function setFreshGasPayment(
  suiClient: SuiClient,
  tx: Transaction,
  owner: string
): Promise<void> {
  const ref = await getFreshGasObjectRef(suiClient, owner);
  if (ref) tx.setGasPayment([ref]);
}

export async function signAndExecuteTransactionWithFreshGas(
  suiClient: SuiClient,
  tx: Transaction,
  signer: Keypair
): Promise<TxExecutionResult> {
  const sender = signer.getPublicKey().toSuiAddress();
  tx.setSender(sender);
  await setFreshGasPayment(suiClient, tx, sender);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await suiClient.core.signAndExecuteTransaction({
        signer,
        transaction: tx,
        include: TX_RESULT_INCLUDE,
      });
      return toTxExecutionResult(result);
    } catch (error) {
      if (attempt === 0 && isStaleObjectVersionError(error)) {
        await sleep(STALE_GAS_RETRY_DELAY_MS);
        await setFreshGasPayment(suiClient, tx, sender);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Transaction failed after refreshing gas payment");
}
