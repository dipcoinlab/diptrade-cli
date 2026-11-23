# DipCoin Perpetual Trading CLI

TypeScript CLI for perpetual futures trading on the Sui blockchain.

## Usage For AI Agent

Send the following skill link to your AI Agent, and it will guide you through the rest — including installation, configuration, and trading:

```
https://raw.githubusercontent.com/dipcoinlab/diptrade-cli/main/SKILL.md
```

## Usage For Human

### Installation

```bash
npm install -g diptrade-cli
```

> This package was previously published as `dipcoin-cli`. To migrate, run `npm uninstall -g dipcoin-cli` and install `diptrade-cli` instead. Your credentials in `~/.config/dipcoin/` are unchanged.

### Configuration

Credentials live in `~/.config/dipcoin/env`. Set them up with one of the two built-in commands — both write the file with `chmod 600` and never echo your private key to the terminal.

**Import an existing Sui wallet:**

```bash
diptrade-cli setup import                  # mainnet (default)
diptrade-cli setup import --network testnet
```

Paste either your `suiprivkey1...` private key **or** a 12-word (or 15/18/21/24) BIP39 mnemonic at the hidden prompt. The input is auto-detected; mnemonics are validated against the BIP39 wordlist and checksum.

**Or generate a new wallet:**

```bash
diptrade-cli setup generate                  # mainnet (default)
diptrade-cli setup generate --network testnet
```

A new Ed25519 keypair is created and saved; the command prints the public Sui address. Transfer USDC on Sui to that address, then run `diptrade-cli account deposit <amount>` to fund the DEX.

#### Config file format

The generated `~/.config/dipcoin/env` contains:

| Variable | Required | Description |
|----------|----------|-------------|
| `DIPCOIN_PRIVATE_KEY` | One of these | Sui private key (`suiprivkey1...`), supports ED25519/Secp256k1/Secp256r1 |
| `DIPCOIN_MNEMONIC` | is required | 12/15/18/21/24-word BIP39 mnemonic |
| `DIPCOIN_NETWORK` | No | `mainnet` or `testnet` (default: `mainnet`) |
| `DIPCOIN_RPC_URL` | No | Sui gRPC-Web endpoint (default: public fullnode `https://fullnode.<network>.sui.io:443`, rate-limited). JSON-RPC URLs are not supported |

If both are set, `DIPCOIN_PRIVATE_KEY` takes precedence. Manual editing is supported but discouraged — prefer the `setup` commands so format and permissions stay correct.

### Quick Start

```bash
# Check available pairs
diptrade-cli market pairs

# Get current price
diptrade-cli market ticker BTC

# Check account balance
diptrade-cli account info

# Open a long position: buy BTC with 100 USDC at 10x leverage
diptrade-cli trade buy BTC 100USDC 10x --tp 105000 --sl 90000

# Monitor position
diptrade-cli position list

# Close position (reduce-only sell)
diptrade-cli trade sell BTC 0 10x --qty 0.01 --reduce-only

# Review history
diptrade-cli history orders --symbol BTC-PERP
```

### Commands

#### Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format (machine-readable) |
| `-V, --version` | Show version |

#### setup

```bash
diptrade-cli setup import                    # Import existing key (hidden prompt)
diptrade-cli setup generate                  # Generate new keypair
diptrade-cli setup import --network testnet  # Same, on testnet
```

#### market

```bash
diptrade-cli market pairs                    # List all trading pairs
diptrade-cli market ticker <symbol>          # Ticker (price, volume, funding)
diptrade-cli market orderbook <symbol>       # Order book
diptrade-cli market oracle <symbol>          # Oracle price
diptrade-cli market kline <symbol>           # Candlestick history (default 1h, last 24h)
diptrade-cli market kline BTC --interval 5m --count 20
diptrade-cli market kline BTC --interval 1d --from <unix-sec> --to <unix-sec>
```

Symbols auto-normalize: `BTC` becomes `BTC-PERP`. `kline` intervals: `1m / 5m / 15m / 30m / 1h / 4h / 1d / 1w`.

#### account

```bash
diptrade-cli account info                    # Balance, margin, PnL
diptrade-cli account info --vault <address>  # Info for specific vault address
diptrade-cli account deposit <amount>        # Deposit USDC to exchange
diptrade-cli account withdraw <amount>       # Withdraw USDC from exchange
```

#### balance

```bash
diptrade-cli balance                         # On-chain coin balances
```

#### trade

```bash
# Buy/Sell with USDC margin amount (auto-converts to quantity)
diptrade-cli trade buy <symbol> <amount> <leverage>
diptrade-cli trade sell <symbol> <amount> <leverage>

# Limit order (auto-detected from --price)
diptrade-cli trade buy BTC 100USDC 10x --price 95000

# With TP/SL
diptrade-cli trade buy BTC 100USDC 10x --tp 105000 --sl 90000

# Explicit quantity instead of USDC margin
diptrade-cli trade buy BTC 0 10x --qty 0.01

# Reduce-only (for closing)
diptrade-cli trade sell BTC 0 10x --qty 0.01 --reduce-only

# List open orders
diptrade-cli trade orders
diptrade-cli trade orders --symbol BTC-PERP

# Cancel orders
diptrade-cli trade cancel <symbol> <hash1> [hash2...]

# Adjust default (ISOLATED) leverage for a market (REST update, no on-chain tx)
diptrade-cli trade leverage BTC 10
diptrade-cli trade leverage ETH 5
```

DipCoin perp currently only supports ISOLATED margin; CROSS is not exposed by the backend.

**Trade Options:**

| Option | Description |
|--------|-------------|
| `--qty <quantity>` | Specify order quantity directly (amount arg ignored) |
| `--price <p>` | Limit order price (auto-enables limit order type) |
| `--reduce-only` | Reduce-only order |
| `--tp <price>` | Take profit trigger price |
| `--sl <price>` | Stop loss trigger price |
| `--vault <address>` | Vault/creator address (for trading vault positions) |

#### position

```bash
diptrade-cli position list                   # List open positions
diptrade-cli position list --symbol BTC-PERP # Filter by symbol

# Set TP/SL on existing position
diptrade-cli position tpsl <symbol> --side <buy|sell> --quantity <q> --leverage <n> \
  --tp-trigger <price> --sl-trigger <price>

# TP/SL with limit type
diptrade-cli position tpsl <symbol> --side sell --quantity 0.01 --leverage 10 \
  --tp-trigger 105000 --tp-type limit --tp-price 105000

# Set or edit TP/SL on a vault position. Existing plan IDs are discovered automatically.
diptrade-cli position tpsl BTC --side sell --quantity 0.01 --leverage 10 \
  --vault <vaultId> --tp-trigger 105000 --sl-trigger 90000

# Close positions — CLI figures out side & qty
diptrade-cli position close BTC                  # close 100% of BTC position
diptrade-cli position close BTC --percent 50     # close half
diptrade-cli position close-all                  # close every open position
diptrade-cli position close-all --percent 50     # halve every open position

# Manual form is still supported (specify exact qty yourself):
diptrade-cli trade sell BTC 0 10x --qty 0.01 --reduce-only   # close 0.01 of a long
diptrade-cli trade buy ETH 0 5x  --qty 1     --reduce-only   # close 1 of a short

# Margin operations (on-chain) — auto-prepends a fresh signed price update
diptrade-cli position margin add <symbol> <amount>
diptrade-cli position margin remove <symbol> <amount>

# Same, but target a vault's position
diptrade-cli position margin add <symbol> <amount> --vault <vaultId>
diptrade-cli position margin remove <symbol> <amount> --vault <vaultId>
```

The `--side` is the **closing side**: use `sell` for long positions, `buy` for short.

> All on-chain margin / vault writes (`position margin add/remove`, `vault deposit/close/withdraw/claim/fill-withdrawals`) fetch a fresh signed price from `/api/perp-market-api/price/latest` and bundle a `price_feed::update_price_feed` PTB step before the actual call — required by the v6 oracle freshness check.

#### vault

On-chain vault operations (DipCoin vault contracts):

```bash
diptrade-cli vault create --name <name> --trader <address> --max-cap <usdc> \
  --min-deposit <usdc> --creator-share <pct> --profit-share <pct> --initial <usdc>

diptrade-cli vault list                      # List vaults created by wallet
diptrade-cli vault list-all                  # List all public vaults (page 1, 10 per page)
diptrade-cli vault list-all --page 2 --page-size 20
diptrade-cli vault list-all --filter Leading # Filter: All, Leading, Newest, HotDeposit
diptrade-cli vault info <vaultId>            # Vault details
diptrade-cli vault position <vaultId>       # Your shares & estimated value
diptrade-cli vault position <vaultId> --address <addr>  # Query another address
diptrade-cli vault deposit <vaultId> <amount>
diptrade-cli vault withdraw <vaultId> <shares>
diptrade-cli vault withdraw <vaultId> --all # Withdraw all shares
diptrade-cli vault fill-withdrawals <vaultId> <requestIDs...>   # creator/operator only
diptrade-cli vault close <vaultId>
diptrade-cli vault remove <vaultId>                              # operator-only (normal creators get "unauthorized")
diptrade-cli vault claim <vaultId>
diptrade-cli vault set-trader <vaultId> <address>
diptrade-cli vault set-sub-trader <vaultId> <address> [--disable]
diptrade-cli vault set-deposit-status <vaultId> [--disable]
diptrade-cli vault set-max-cap <vaultId> <amount>
diptrade-cli vault set-min-deposit <vaultId> <amount>
diptrade-cli vault set-auto-close <vaultId> [--disable]
```

#### referral

```bash
diptrade-cli referral bind <code>               # Bind a referral code
diptrade-cli referral link                      # Get your referral link and invite code
diptrade-cli referral change-code <code>        # Change your referral code
diptrade-cli referral invitees                  # List your invitees
diptrade-cli referral invitees --page 2 --page-size 20
```

#### history

```bash
diptrade-cli history orders [--symbol <s>] [--page <n>] [--size <n>]
diptrade-cli history funding [--symbol <s>] [--page <n>] [--size <n>]
diptrade-cli history balance [--page <n>] [--size <n>]
```

All history commands support `--vault <address>` and `--begin-time <ms>`.

## Development

```bash
npm run cli              # Run CLI in dev mode (tsx)
npm run build            # Build for distribution
npm run lint             # Run ESLint
```

## License

Apache License 2.0
