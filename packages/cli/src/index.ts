#!/usr/bin/env node
/**
 * @saasagent/cli — `agentsaas` command-line tool.
 *
 * Per FR-SDK-003: scaffolds sub-agents (`agentsaas init sub-agent --lang ts|py`),
 * manages registry uploads, runs the platform locally for development.
 *
 * Status: Phase 0 (skeleton — commands print stubs).
 */

const VERSION = '0.0.0';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  console.log(VERSION);
  process.exit(0);
}

switch (command) {
  case 'init':
    console.log(`agentsaas init — Phase 0 stub (sub-agent scaffolding lands in Phase 3).`);
    break;
  case 'dev':
    console.log(`agentsaas dev — Phase 0 stub (local platform startup lands in Phase 1).`);
    break;
  case 'registry':
    console.log(`agentsaas registry — Phase 0 stub (registry management lands in Phase 2).`);
    break;
  default:
    console.error(`unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

function printHelp(): void {
  console.log(`agentsaas v${VERSION} — SaaSAgent platform CLI

Usage: agentsaas <command> [options]

Commands (Phase 0 — most are stubs):
  init <type>      Scaffold a sub-agent / skill / feature (Phase 3+)
  dev              Start the platform locally for development (Phase 1+)
  registry <verb>  Manage registries (upload / list / validate) (Phase 2+)

Flags:
  --version, -v    Print version
  --help, -h       Print this help
`);
}
