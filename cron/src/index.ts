import {
	chains,
	createAccount,
	createClient,
} from "genlayer-js";

const { testnetBradbury } = chains;

const PAGE_SIZE = 50n;
const CONTRACT_ADDRESS_PATTERN =
	/^0x[a-fA-F0-9]{40}$/;

interface Env {
	HEDGIX_CONTRACT_ADDRESS: string;
	SETTLEMENT_OPERATOR_PRIVATE_KEY: string;
	SETTLEMENT_API_TOKEN: string;
}

type JsonRecord = Record<string, unknown>;

function safeStringify(data: unknown): string {
	return JSON.stringify(
		data,
		(_key, value) =>
			typeof value === "bigint"
				? value.toString()
				: value,
		2,
	);
}

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(safeStringify(data), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
	});
}

function parseJsonValue(value: unknown): unknown {
	if (typeof value !== "string") {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

function asRecord(value: unknown): JsonRecord | null {
	const parsed = parseJsonValue(value);

	if (
		typeof parsed === "object" &&
		parsed !== null &&
		!Array.isArray(parsed)
	) {
		return parsed as JsonRecord;
	}

	return null;
}

function asBoolean(value: unknown): boolean {
	if (value === true) {
		return true;
	}

	if (
		typeof value === "string" &&
		value.toLowerCase() === "true"
	) {
		return true;
	}

	return false;
}

function requirePrivateKey(value: string): `0x${string}` {
	if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
		throw new Error(
			"SETTLEMENT_OPERATOR_PRIVATE_KEY is missing or invalid",
		);
	}

	return value as `0x${string}`;
}

function requireContractAddress(value: string): `0x${string}` {
	const normalized = value?.trim();

	if (
		typeof normalized !== "string" ||
		!CONTRACT_ADDRESS_PATTERN.test(normalized)
	) {
		throw new Error(
			"HEDGIX_CONTRACT_ADDRESS is missing or invalid",
		);
	}

	return normalized as `0x${string}`;
}

function getBearerToken(request: Request): string | null {
	const authorization =
		request.headers.get("authorization");

	if (!authorization?.startsWith("Bearer ")) {
		return null;
	}

	return authorization
		.slice("Bearer ".length)
		.trim();
}

function extractTransactionHash(
	value: unknown,
): `0x${string}` | null {
	if (
		typeof value === "string" &&
		value.startsWith("0x")
	) {
		return value as `0x${string}`;
	}

	const record = asRecord(value);

	if (!record) {
		return null;
	}

	const possibleHash =
		record.hash ??
		record.transactionHash ??
		record.txHash;

	if (
		typeof possibleHash === "string" &&
		possibleHash.startsWith("0x")
	) {
		return possibleHash as `0x${string}`;
	}

	return null;
}

function createReadClient() {
	return createClient({
		chain: testnetBradbury,
	});
}

function createSettlementClient(env: Env) {
	const account = createAccount(
		requirePrivateKey(
			env.SETTLEMENT_OPERATOR_PRIVATE_KEY,
		),
	);

	const client = createClient({
		chain: testnetBradbury,
		account,
	});

	return {
		client,
		account,
	};
}

async function readContract(
	contractAddress: `0x${string}`,
	functionName: string,
	args: unknown[] = [],
): Promise<unknown> {
	const client = createReadClient();

	const result = await client.readContract({
		address: contractAddress,
		functionName,
		args: args as never[],
		jsonSafeReturn: true,
	});

	return parseJsonValue(result);
}

async function getAllActiveProtectionIds(
	contractAddress: `0x${string}`,
): Promise<string[]> {
	const protectionIds: string[] = [];
	let start = 0n;

	while (true) {
		const pageResult = await readContract(
			contractAddress,
			"get_active_protection_ids_paginated",
			[start, PAGE_SIZE],
		);

		const page = asRecord(pageResult);

		if (!page) {
			throw new Error(
				"Invalid active-protection page returned by contract",
			);
		}

		const pageIds = Array.isArray(
			page.protection_ids,
		)
			? page.protection_ids
			: [];

		for (const id of pageIds) {
			if (
				typeof id === "string" ||
				typeof id === "number" ||
				typeof id === "bigint"
			) {
				protectionIds.push(String(id));
			}
		}

		const hasMore = asBoolean(
			page.has_more,
		);

		if (!hasMore || pageIds.length === 0) {
			break;
		}

		start += PAGE_SIZE;
	}

	return protectionIds;
}

async function runSettlementCycle(env: Env) {
	const startedAt =
		new Date().toISOString();
	const contractAddress = requireContractAddress(
		env.HEDGIX_CONTRACT_ADDRESS,
	);

	const [
		pausedResult,
		owner,
		settlementOperator,
	] = await Promise.all([
		readContract(
			contractAddress,
			"is_paused",
		),
		readContract(
			contractAddress,
			"get_owner",
		),
		readContract(
			contractAddress,
			"get_settlement_operator",
		),
	]);

	const paused = asBoolean(pausedResult);

	const { client, account } =
		createSettlementClient(env);

	if (paused) {
		return {
			ok: true,
			skipped: true,
			reason: "contract is paused",
			startedAt,
			finishedAt:
				new Date().toISOString(),
			owner,
			settlementOperator,
			operatorAddress:
				account.address,
			results: [],
		};
	}

	if (
		typeof settlementOperator !==
			"string" ||
		settlementOperator.toLowerCase() !==
			account.address.toLowerCase()
	) {
		throw new Error(
			`Configured wallet ${account.address} is not the on-chain settlement operator ${String(settlementOperator)}`,
		);
	}

	const activeProtectionIds =
		await getAllActiveProtectionIds(
			contractAddress,
		);

	const results: JsonRecord[] = [];

	for (
		const protectionId of activeProtectionIds
	) {
		try {
			const readinessValue =
				await readContract(
					contractAddress,
					"get_settlement_readiness",
					[protectionId],
				);

			const readiness =
				asRecord(readinessValue);

			if (!readiness) {
				results.push({
					protectionId,
					status: "skipped",
					reason:
						"invalid readiness response",
					readiness:
						readinessValue,
				});

				continue;
			}

			const ready = asBoolean(
				readiness.ready,
			);

			const expectedSettlementDate =
				readiness.expected_settlement_date;

			if (
				!ready ||
				typeof expectedSettlementDate !==
					"string" ||
				expectedSettlementDate.length === 0
			) {
				results.push({
					protectionId,
					status: "not-ready",
					reason:
						readiness.reason ??
						"not ready",
					readiness,
				});

				continue;
			}

			const transactionResult =
				await client.writeContract({
					account,
					address:
						contractAddress,
					functionName:
						"settle_protection_day",
					args: [
						protectionId,
						expectedSettlementDate,
					],
					value: 0n,
				});

			const transactionHash =
				extractTransactionHash(
					transactionResult,
				);

			if (!transactionHash) {
				results.push({
					protectionId,
					status: "submitted",
					settlementDate:
						expectedSettlementDate,
					transactionResult,
					warning:
						"Transaction submitted but hash could not be extracted",
				});

				continue;
			}

			const receipt =
				await client.waitForTransactionReceipt({
					hash:
						transactionHash as Parameters<
							typeof client.waitForTransactionReceipt
						>[0]["hash"],
					interval: 5000,
					retries: 120,
				});

			results.push({
				protectionId,
				status: "settled",
				settlementDate:
					expectedSettlementDate,
				transactionHash,
				receipt,
			});
		} catch (error) {
			results.push({
				protectionId,
				status: "failed",
				error:
					error instanceof Error
						? error.message
						: String(error),
			});
		}
	}

	return {
		ok: true,
		mode: "transaction-enabled",
		network: {
			name: testnetBradbury.name,
			chainId: testnetBradbury.id,
		},
		contract: contractAddress,
		operatorAddress:
			account.address,
		owner,
		settlementOperator,
		activeProtectionCount:
			activeProtectionIds.length,
		startedAt,
		finishedAt:
			new Date().toISOString(),
		results,
	};
}

export default {
	async fetch(
		request: Request,
		env: Env,
	): Promise<Response> {
		const url = new URL(request.url);

		if (
			request.method === "GET" &&
			url.pathname === "/health"
		) {
			const contractAddress =
				requireContractAddress(
					env.HEDGIX_CONTRACT_ADDRESS,
				);

			return jsonResponse({
				ok: true,
				service:
					"hedgix-settlement-worker",
				mode:
					"transaction-enabled",
				network:
					testnetBradbury.name,
				contract:
					contractAddress,
				time:
					new Date().toISOString(),
			});
		}

		if (
			request.method === "POST" &&
			url.pathname === "/api/settle"
		) {
			const providedToken =
				getBearerToken(request);

			if (
				!providedToken ||
				providedToken !==
					env.SETTLEMENT_API_TOKEN
			) {
				return jsonResponse(
					{
						ok: false,
						error:
							"UNAUTHORIZED",
					},
					401,
				);
			}

			try {
				const result =
					await runSettlementCycle(
						env,
					);

				return jsonResponse(result);
			} catch (error) {
				console.error(
					"Manual settlement failed",
					error,
				);

				return jsonResponse(
					{
						ok: false,
						error:
							error instanceof Error
								? error.message
								: String(
										error,
									),
					},
					500,
				);
			}
		}

		return jsonResponse(
			{
				ok: false,
				error: "NOT_FOUND",
				availableRoutes: [
					"GET /health",
					"POST /api/settle",
				],
			},
			404,
		);
	},

	async scheduled(
		controller: ScheduledController,
		env: Env,
	): Promise<void> {
		console.log(
			`Hedgix settlement cron started: ${controller.cron}`,
		);

		try {
			const result =
				await runSettlementCycle(env);

			console.log(
				"Hedgix settlement cron completed",
				safeStringify(result),
			);
		} catch (error) {
			console.error(
				"Hedgix settlement cron failed",
				error,
			);

			throw error;
		}
	},
} satisfies ExportedHandler<Env>;
