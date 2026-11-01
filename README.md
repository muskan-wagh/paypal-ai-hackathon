# ProofPay

**AI-gated milestone payouts for freelancers** — built for the PayPal AI Hackathon 2026.

A client funds a milestone via PayPal → AI generates an acceptance checklist from the task
brief → the freelancer submits proof → AI evaluates the proof against the checklist → the
client gives the final human approval → PayPal Payouts sends the money to the freelancer.

PayPal is the money rail (order approval → capture → payout) and the AI is load-bearing
(checklist generation + proof evaluation), but **AI never moves money** — a human always
stands between an evaluation and a payout.

## Quickstart

```bash
nvm install 22 && nvm use 22   # Node 22+ required
npm install
cp .env.example .env           # fill in the values (see comments in that file)
npm run dev                    # → http://localhost:3000/spike
```

Environment values: PayPal **Sandbox** credentials from
[developer.paypal.com](https://developer.paypal.com) (Apps & Credentials → Sandbox),
an [OpenRouter](https://openrouter.ai/keys) API key, and the sandbox personal account
email that receives test payouts.

## Status

Phase 2 in progress — sandbox spikes (checkout approval + capture, payouts round-trip,
OpenRouter ping). See `plan.md` for the full plan.
