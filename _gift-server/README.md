# TofuBot gift server

The Cloudflare Worker behind [xenonin.com/tofubot/gift](https://xenonin.com/tofubot/gift/).
This folder is not part of the website (Jekyll skips folders that start with `_`).

## How it is deployed

A change pushed to this folder runs `.github/workflows/gift-server.yml`. That workflow:

1. Finds the D1 database `tofubot-gifts`, or creates it if it is missing.
2. Adds any missing tables (`schema.sql`).
3. Deploys `worker.js` as the Worker `tofubot-media`.
4. Writes the Worker address into `tofubot/gift/api.txt`. The gift page and every TofuBot read the address from that file.

It needs the repository secret `CLOUDFLARE_API_TOKEN` (added 2026-11-23). Make it from the "Edit Cloudflare Workers" token template, with **Account > D1 > Edit** added.

You can also run it by hand: Actions → TofuBot gift server → Run workflow.

## Who can do what

- **A TofuBot** uses only its own 8-character code. It checks every 10 minutes.
- **The gifter** opens the page with that code and sets a 4-digit PIN on the first visit. Every change needs the PIN.
- **Wrong PINs:** five wrong tries lock the code for 15 minutes. Each further wrong try doubles the lock, up to one day.

## Support tasks (Cloudflare dashboard → D1 → tofubot-gifts → Console)

| Task | SQL |
|---|---|
| Gifter forgot the PIN (they can set a new one; daily texts and gifts stay) | `DELETE FROM owners WHERE code = 'ABCD2345';` |
| See a TofuBot's last check-in and firmware | `SELECT * FROM devices WHERE code = 'ABCD2345';` |

The TofuBot owner can also tap **New code** in the TofuBot panel. The old code then stops working, and its daily texts are removed from the bot.

## Limits

| What | Limit |
|---|---|
| Daily texts | 20 |
| Gifts waiting | 3 at a time |
| A message | shown 1 to 5 times, on the day it arrives |
| A picture | shown 1 to 4 times, on the day it arrives |
| English text | up to 90 letters, as text |
| Bengali text | drawn by the page as a small picture of the text, up to 3 lines |
| GIF | under 700 KB |
