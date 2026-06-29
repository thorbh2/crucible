# Crucible V2

The project is built as a small on-chain court rather than a static demo: users create records, attach sources, ask GenLayer to reason over them, and keep the decision trail readable.

A GenLayer staked duel court.

## Crucible Brief

This repo is organized for review: the app can be opened locally, the contract source is present, and the deployed Studionet address is pinned in `deployment.json`.

- Folder: `projects/02-crucible`
- Frontend shape: static browser app
- Contract source: `contracts/crucible_v2.py`
- Build status: Schema-valid (43516 bytes, 20 write + 20 view); deployed + 19 write smoke txs finalized incl 4 GenLayer reasoning calls and legacy open/accept/rule; 39/39 read tests passed; app.js repointed.

## Adjudication Mechanics

Crucible V2 (# v0.2.16), 43516 bytes, 20 write + 20 view.

- Primary source: `contracts/crucible_v2.py` (43,516 bytes)
- Public write/action methods: 20
- Read methods: 20
- GenLayer features: live web rendering, LLM adjudication, validator-comparative consensus, indexed storage, append-only collections

Typical flow: `open_staked_duel` -> `submit_challenge` -> `resolve_challenge_with_genlayer` -> `open_challenge_window` -> `submit_appeal` -> `archive_duel` -> `set_crucible_standard`

Useful reads: `get_duel_count`, `get_duel`, `get_argument_count`, `get_argument`, `get_duel_record`, `get_recent_duels`, `get_duels_by_status`, `get_party_duels`

## Deployment Evidence

- Network: studionet (61999)
- Contract: [0x1Dfa8D1987f33bB5f31158012340956468a144Ec](https://explorer-studio.genlayer.com/contracts/0x1Dfa8D1987f33bB5f31158012340956468a144Ec)
- Deploy tx: [0x6903c172...7a2a5f](https://explorer-studio.genlayer.com/tx/0x6903c1721d337d73dcae799dae4e221e0c4f3270e1c7ed7ade0c0b2aeb7a2a5f)
- Deployed at: 2026-06-23T21:45:49.704Z
- Smoke writes recorded: 19

Smoke coverage:

- set_standard: [0xe1b89039...ab67d1](https://explorer-studio.genlayer.com/tx/0xe1b89039248f09bc1789824c50969d96df987235023e56f727b339f4dcab67d1)
- draft_duel: [0x221ec505...049869](https://explorer-studio.genlayer.com/tx/0x221ec505306417820cfbf6bc21ca6a8aee0c233825ccc7580f5d79c5fe049869)
- add_case_for: [0x2cf821e4...e3eb04](https://explorer-studio.genlayer.com/tx/0x2cf821e4c6883af81303bbfbfd2e893957b48080249caaa06083d971a2e3eb04)
- add_case_against: [0xd0d1257b...e3e166](https://explorer-studio.genlayer.com/tx/0xd0d1257b3418bed4e5265e4dd16b5df42d813ff99d974560f96c6c81afe3e166)
- add_evidence_whitepaper: [0x3f6bb7f1...80c4c7](https://explorer-studio.genlayer.com/tx/0x3f6bb7f1834f14a54108ad5f4058de56bfd30abf4d39d915676062251f80c4c7)
- add_evidence_eth: [0xc82cea30...890fb4](https://explorer-studio.genlayer.com/tx/0xc82cea308e804048a2d2d835ac177f1e6f3ff88ccb0df94e45d7a81ff2890fb4)

## Operator Preview

```powershell
cd C:\Users\aspronim\Desktop\design-skills
npm run preview:start
npm run preview:project -- 02-crucible
```

Open http://localhost:8080/02-crucible/.

## Release Command

```powershell
cd C:\Users\aspronim\Desktop\design-skills
npm run publish:project -- -Project 02-crucible -Repo https://github.com/thorbh2/crucible.git
```

Published repository: https://github.com/thorbh2/crucible.git

## Public Repo Safety

The repo is designed for public GitHub/Vercel release. Keep `.env`, `.vercel/`, wallet vaults, private keys and local dashboard state out of git. The publisher script enforces these ignore rules before it pushes.
