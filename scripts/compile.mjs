/* Compiles contracts/Database.sol with solc (no Hardhat) and refreshes
   abi/Database.json — the artifact used by the app and the deploy script. */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import solc from "solc";

const source = readFileSync("contracts/Database.sol", "utf8");

const input = {
  language: "Solidity",
  sources: { "Database.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object"] },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

const errors = (output.errors ?? []).filter((e) => e.severity === "error");
if (errors.length) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}
for (const w of (output.errors ?? []).filter((e) => e.severity === "warning")) {
  console.warn(w.formattedMessage);
}

const contract = output.contracts["Database.sol"]["Database"];
mkdirSync("abi", { recursive: true });
writeFileSync(
  "abi/Database.json",
  JSON.stringify(
    {
      contractName: "Database",
      abi: contract.abi,
      bytecode: "0x" + contract.evm.bytecode.object,
    },
    null,
    2
  )
);
console.log(`Compiled Database.sol — ${contract.abi.length} ABI entries written to abi/Database.json`);
