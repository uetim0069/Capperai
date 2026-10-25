# Ludowhot

Node 22+ server, no dependencies. Serves the site (`public/`) and runs accounts, wallet, escrow, matchmaking, Paystack payments and both games.

    node server.js      # http://localhost:3000, demo mode (free ₦5,000, no real money)
    npm test            # auth, escrow, matches, and payments (against a mock Paystack)

## Going live with real money, manual payments (no payment provider)
Set these environment variables. Deposits and withdrawals are then confirmed and paid by you from the admin page.

| Variable | Purpose |
|---|---|
| `REAL_MONEY=1` | Turns on real-money mode (removes the free demo funds) |
| `ADMIN_TOKEN` | Long random secret (30+ characters) for the admin page |
| `PAY_BANK_NAME`, `PAY_ACCOUNT_NUMBER`, `PAY_ACCOUNT_NAME` | The bank account players send deposits to |
| `PAY_NOTE` | Optional extra instruction shown to players |
| `LICENCE_TEXT` | Shown in the footer |
| `DATA_DIR` | Persistent disk path for db.json |
| `REQUIRE_KYC=0` | Optional: let players withdraw without KYC approval (default: KYC required) |
| `ALLOW_BOT_STAKES=1` | Optional: allow staked games against the bot |

## Admin page
Open `https://YOUR-DOMAIN/admin` and enter your `ADMIN_TOKEN`.

- **Deposits:** the player requests a deposit and gets a reference code (e.g. LW-K3P9TR) to put in their bank transfer. Check your bank, then Approve (you can change the amount if they sent a different sum) or Reject.
- **Withdrawals:** the player's balance is deducted when they request. Send the money to the account shown, then tap Mark as paid. Reject refunds them.
- **KYC:** players cannot withdraw until you approve them.

## Paystack (optional, automatic payments)
If you later get Paystack, set `PAYSTACK_SECRET_KEY` and `BASE_URL`, add the webhook `https://YOUR-DOMAIN/api/paystack/webhook`, and the site switches to automatic deposits and transfers.
