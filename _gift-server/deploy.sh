#!/usr/bin/env bash
# Deploys the TofuBot gift server (Cloudflare Worker "tofubot-media" + D1 database "tofubot-gifts")
# and writes the Worker's address into tofubot/gift/api.txt (the gift page and every TofuBot read it from there).
# Runs in GitHub Actions (.github/workflows/gift-server.yml) with the CLOUDFLARE_API_TOKEN repository secret.
set -euo pipefail
cd "$(dirname "$0")"
export WRANGLER_SEND_METRICS=false CI=true
W="npx --yes wrangler@4.155.0"
DB=tofubot-gifts

find_db() { $W d1 list --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s.slice(s.indexOf("[")));const d=a.find(x=>x.name===process.argv[1]);process.stdout.write(d?d.uuid:"")})' "$DB"; }

echo "== Database"
ID=$(find_db)
if [ -z "$ID" ]; then
  echo "Creating the D1 database $DB"
  $W d1 create "$DB" >/dev/null
  ID=$(find_db)
fi
[ -n "$ID" ] || { echo "::error::Could not find or create the D1 database $DB. Does the token have Account > D1 > Edit?"; exit 1; }
sed -i -E "s/^database_id = .*/database_id = \"$ID\"/" wrangler.toml
echo "D1 $DB: $ID"
$W d1 execute "$DB" --remote --yes --file=schema.sql

echo "== Worker"
OUT=$($W deploy 2>&1 | tee /dev/stderr)
URL=$(printf '%s\n' "$OUT" | grep -oE 'https://[A-Za-z0-9.-]+\.workers\.dev' | head -1 || true)
[ -n "$URL" ] || { echo "::error::Deployed, but the workers.dev address was not in the output. Open Workers & Pages in Cloudflare once to pick a workers.dev subdomain, then run this again."; exit 1; }
curl -fsS "$URL/" | grep -q "TofuBot gift server" || { echo "::error::$URL does not answer like the gift server yet"; exit 1; }

echo "$URL" > ../tofubot/gift/api.txt
echo "::notice::Gift server is live at $URL"
