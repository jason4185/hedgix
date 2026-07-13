import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const NEW_CONTRACT_ADDRESS =
	"0xFc7A79324f8624DeFb10e9771Af45A5444ea708D";
const ETH_ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/g;
const FRONTEND_ADDRESS_ENV = [
	"VITE",
	"HEDGIX_CONTRACT_ADDRESS",
].join("_");

async function readProjectFile(path) {
	return readFile(
		new URL(`../${path}`, import.meta.url),
		"utf8",
	);
}

function assertOnlyExpectedAddress(value) {
	for (const match of value.matchAll(ETH_ADDRESS_PATTERN)) {
		assert.equal(match[0], NEW_CONTRACT_ADDRESS);
	}
}

test("cron source loads and validates the configured contract address", async () => {
	const source = await readProjectFile("src/index.ts");

	assert.match(
		source,
		/HEDGIX_CONTRACT_ADDRESS:\s*string/,
	);
	assert.match(
		source,
		/CONTRACT_ADDRESS_PATTERN\s*=\s*\n?\s*\/\^0x\[a-fA-F0-9\]\{40\}\$\/;/,
	);
	assert.match(
		source,
		/requireContractAddress\(\s*env\.HEDGIX_CONTRACT_ADDRESS,?\s*\)/,
	);
	assert.equal(source.includes(FRONTEND_ADDRESS_ENV), false);
	assertOnlyExpectedAddress(source);
});

test("cron reads and writes use the configured contract address", async () => {
	const source = await readProjectFile("src/index.ts");

	assert.match(
		source,
		/client\.readContract\(\{\s*address:\s*contractAddress/s,
	);
	assert.match(
		source,
		/client\.writeContract\(\{\s*account,\s*address:\s*contractAddress/s,
	);
	assert.doesNotMatch(source, /address:\s*["']0x[a-fA-F0-9]{40}["']/);
});

test("wrangler config points the cron worker at the new contract", async () => {
	const config = await readProjectFile("wrangler.jsonc");

	assert.match(
		config,
		new RegExp(
			`"HEDGIX_CONTRACT_ADDRESS"\\s*:\\s*"${NEW_CONTRACT_ADDRESS}"`,
		),
	);
	assertOnlyExpectedAddress(config);
});

test("local env example documents the same contract address without real secrets", async () => {
	const example = await readProjectFile(".dev.vars.example");

	assert.match(
		example,
		new RegExp(`HEDGIX_CONTRACT_ADDRESS=${NEW_CONTRACT_ADDRESS}`),
	);
	assert.match(
		example,
		/SETTLEMENT_OPERATOR_PRIVATE_KEY=0x<64-hex-private-key>/,
	);
	assert.match(
		example,
		/SETTLEMENT_API_TOKEN=<local-settlement-token>/,
	);
	assertOnlyExpectedAddress(example);
});
