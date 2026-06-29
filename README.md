# Crucible

Crucible is a GenLayer staked-debate court: two parties enter a motion, commit matching GEN stakes, submit opposing cases, and let an intelligent contract adjudicate the record with live web evidence, LLM reasoning, validator-comparative consensus, challenges, appeals, settlement, and reputation.

This is not a landing-page mockup. The repository contains the static product UI, the deployed Studionet contract source, deployment metadata, smoke transaction evidence, and tests.

## Live System

| Surface | Link |
| --- | --- |
| App | https://crucible-drab.vercel.app |
| GitHub | https://github.com/thorbh2/crucible |
| Contract | https://explorer-studio.genlayer.com/contracts/0x1Dfa8D1987f33bB5f31158012340956468a144Ec |
| Deploy tx | https://explorer-studio.genlayer.com/tx/0x6903c1721d337d73dcae799dae4e221e0c4f3270e1c7ed7ade0c0b2aeb7a2a5f |
| Vercel inspect | https://vercel.com/aspros-projects-07dbbeb8/crucible/ApNGk8At8cAsz9dFYGBS3uveqbJN |

## What Crucible Proves

Crucible turns a debate into a verifiable dispute lifecycle:

1. A creator opens a duel and stakes GEN.
2. A challenger accepts with an opposing case and matching stake.
3. Evidence and arguments are attached to the record.
4. GenLayer reads and reasons over the dispute.
5. The contract opens challenge and appeal windows.
6. The final settlement pays or archives the duel.
7. Reputation updates are kept alongside the audit trail.

The frontend preserves the original face-off arena UX, but the contract behind it was upgraded into a larger protocol with lifecycle state, challenge/appeal logic, reputation, indexed reads, and legacy compatibility wrappers.

## Contract Architecture

| Area | Detail |
| --- | --- |
| Contract | `contracts/crucible_v2.py` |
| Size | 43,516 bytes |
| Network | GenLayer Studionet, chain id `61999` |
| Write methods | 20 |
| Read methods | 20 |
| GenLayer features | `gl.nondet.web.render`, `gl.nondet.exec_prompt`, `gl.eq_principle.prompt_comparative` |
| Storage model | duel records, case records, evidence, challenge records, appeal records, reputation, audit events |
| Legacy UI support | `open_duel`, `accept_duel`, `rule`, `get_duel`, `get_duel_count`, `get_argument` |

Core lifecycle:

```text
draft_duel
  -> add_case_for / add_case_against
  -> add_evidence
  -> open_deliberation
  -> judge_with_genlayer
  -> open_challenge_window
  -> submit_challenge
  -> resolve_challenge_with_genlayer
  -> submit_appeal
  -> resolve_appeal_with_genlayer
  -> settle
  -> archive_duel
```

Useful reads:

```text
get_duel_count
get_duel
get_duel_record
get_argument_count
get_argument
get_recent_duels
get_duels_by_status
get_party_duels
```

## Verification Trail

The deployed contract was smoke-tested with 19 finalized writes, including legacy UI paths and four GenLayer reasoning calls.

| Step | Transaction |
| --- | --- |
| Set standard | https://explorer-studio.genlayer.com/tx/0xe1b89039248f09bc1789824c50969d96df987235023e56f727b339f4dcab67d1 |
| Draft duel | https://explorer-studio.genlayer.com/tx/0x221ec505306417820cfbf6bc21ca6a8aee0c233825ccc7580f5d79c5fe049869 |
| Add FOR case | https://explorer-studio.genlayer.com/tx/0x2cf821e4c6883af81303bbfbfd2e893957b48080249caaa06083d971a2e3eb04 |
| Add AGAINST case | https://explorer-studio.genlayer.com/tx/0xd0d1257b3418bed4e5265e4dd16b5df42d813ff99d974560f96c6c81afe3e166 |
| Add whitepaper evidence | https://explorer-studio.genlayer.com/tx/0x3f6bb7f1834f14a54108ad5f4058de56bfd30abf4d39d915676062251f80c4c7 |
| Add web evidence | https://explorer-studio.genlayer.com/tx/0xc82cea308e804048a2d2d835ac177f1e6f3ff88ccb0df94e45d7a81ff2890fb4 |
| GenLayer judge | https://explorer-studio.genlayer.com/tx/0x7df4a52bdeba52195c6ac72740b8e4636629286adb8940c6179bb167cdb1b6a6 |
| Challenge resolution | https://explorer-studio.genlayer.com/tx/0x3cf8fb655f4c5c5432eba703db4d9bb76cf7d76ed05c75a8ecd104a8fffd5c55 |
| Appeal resolution | https://explorer-studio.genlayer.com/tx/0x4f7db4e83519fa97c8914e9df69bee6f94a50b2ac2e3941e533924bd18b43ca8 |
| Settle | https://explorer-studio.genlayer.com/tx/0xb8a28b40036a5a8901c40c5cc1044bdbd9d93d266ecccb19fd89e4b846539b25 |

Test result:

```text
Schema valid
19 smoke writes finalized
39/39 read assertions passed
Static frontend repointed and Vercel-deployed
```

## Frontend

Crucible ships as a static WebGL-styled face-off interface:

- split FOR / AGAINST composition
- Three.js clash arena
- live wallet connection through the bundled browser client
- on-chain read flow through GenLayer JS
- write actions routed through the connected EVM wallet
- standalone Vercel bundle with local `shared/` client files

## Run Locally

From the private workspace:

```powershell
cd <private-workspace-root>
npm run preview:start
npm run preview:project -- 02-crucible
```

Open:

```text
http://localhost:8080/02-crucible/
```

## Publish / Redeploy

```powershell
cd <private-workspace-root>
npm run publish:project -- -Project 02-crucible -Repo https://github.com/thorbh2/crucible.git
```

Vercel production redeploy from the project folder:

```powershell
cd <this-repository-folder>
npx --yes vercel@latest --prod --yes
```

## Repository Safety

This public repository intentionally excludes local secrets:

- no private keys
- no vault files
- no `.env` files
- no `.vercel` project state
- no local dashboard data

Public files include only frontend code, contract source, deployment metadata, tests, and non-sensitive proof links.
