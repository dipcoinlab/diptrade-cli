// Copyright (c) 2025 Dipcoin LLC
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from "@mysten/sui/client";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { deriveDynamicFieldID } from "@mysten/sui/utils";

/**
 * Sui client used across the SDK.
 *
 * JSON-RPC has been disabled on public fullnodes, so all on-chain reads and
 * transaction execution go through gRPC (`client.core.*`).
 */
export type SuiClient = SuiGrpcClient;

/** Transaction result include flags used for every executed transaction. */
export const TX_RESULT_INCLUDE = { effects: true, events: true } as const;

export type RawTxResult = SuiClientTypes.TransactionResult<typeof TX_RESULT_INCLUDE>;

/**
 * Normalized transaction execution result.
 *
 * Keeps the `digest` / `effects.status.{status,error}` shape the CLI output
 * (and `--json` consumers) relied on with JSON-RPC responses.
 */
export interface TxExecutionResult {
  digest: string;
  effects: {
    status: {
      status: "success" | "failure";
      error?: string;
    };
  };
  events: SuiClientTypes.Event[];
}

export function getGrpcFullnodeUrl(network: string): string {
  switch (network) {
    case "mainnet":
      return "https://fullnode.mainnet.sui.io:443";
    case "testnet":
      return "https://fullnode.testnet.sui.io:443";
    case "devnet":
      return "https://fullnode.devnet.sui.io:443";
    case "localnet":
      return "http://127.0.0.1:9000";
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}

/**
 * Create a gRPC Sui client. `baseUrl` overrides the public fullnode and must be
 * a gRPC-Web capable endpoint (e.g. from an RPC provider).
 */
export function createSuiClient(network: string, baseUrl?: string): SuiClient {
  return new SuiGrpcClient({ network, baseUrl: baseUrl || getGrpcFullnodeUrl(network) });
}

export function formatExecutionError(error: SuiClientTypes.ExecutionError | null): string {
  if (!error) return "unknown execution error";
  return error.message || JSON.stringify(error);
}

export function toTxExecutionResult(result: RawTxResult): TxExecutionResult {
  const tx = result.$kind === "Transaction" ? result.Transaction : result.FailedTransaction;
  const status = tx.status;
  return {
    digest: tx.digest,
    effects: {
      status: status.success
        ? { status: "success" }
        : { status: "failure", error: formatExecutionError(status.error) },
    },
    events: tx.events ?? [],
  };
}

/**
 * Read an object's Move struct as JSON. Note gRPC JSON is flat: nested structs
 * are plain objects (no JSON-RPC style `fields` wrapper) and UIDs are strings.
 * Returns `null` when the object does not exist.
 */
export async function getObjectJson<T = any>(
  client: SuiClient,
  objectId: string
): Promise<T | null> {
  const [json] = await getObjectsJson<T>(client, [objectId]);
  return json;
}

/** Batch variant of {@link getObjectJson}; missing objects map to `null`. */
export async function getObjectsJson<T = any>(
  client: SuiClient,
  objectIds: string[]
): Promise<(T | null)[]> {
  const { objects } = await client.core.getObjects({ objectIds, include: { json: true } });
  return objects.map((obj) => (obj instanceof Error ? null : (obj.json as T) ?? null));
}

/**
 * Read a dynamic field (`dynamic_field::Field<K, V>`) as JSON
 * (`{ id, name, value }`). Returns `null` when the field does not exist.
 */
export async function getDynamicFieldJson<T = any>(
  client: SuiClient,
  parentId: string,
  name: { type: string; bcs: Uint8Array }
): Promise<{ id: string; name: unknown; value: T } | null> {
  const fieldId = deriveDynamicFieldID(parentId, name.type, name.bcs);
  return getObjectJson(client, fieldId);
}
