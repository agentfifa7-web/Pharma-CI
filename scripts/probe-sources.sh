#!/usr/bin/env bash
# Télécharge une copie brute des sources candidates pour écrire les parseurs (temporaire).
set -u
OUT=probe-out; mkdir -p "$OUT"
UA='PHARMA-CI-sync/1.0 (+https://github.com/agentfifa7-web/pharma-ci)'
fetch() { # nom url
  code=$(curl -sSL -A "$UA" -m 120 -o "$OUT/$1" -w '%{http_code} %{size_download} %{url_effective}' "$2" 2>&1)
  echo "$1 $code" | tee -a "$OUT/index2.txt"
}
fetch depps-espr.pdf 'https://www.depps.sante.gouv.ci/DocPDF/DOCUMENTS%20DE%20R%C3%89F%C3%89RENCE/Liste%20des%20ESPr%20autoris%C3%A9s%20E-DEPPS%20Juin%202026.pdf'
fetch depps-etabsante.html 'https://www.depps.sante.gouv.ci/Home/EtablissementSante'
fetch depps-etab.html 'https://www.depps.sante.gouv.ci/Home/Etablissement'
fetch airp-index.js 'https://airp.ci/assets/index-C-TjEq_r.js'
fetch ordre-home.html 'https://www.ordrepharmacien.ci/'
fetch sante-actu.html 'https://www.sante.gouv.ci/actualites'
Q='[out:json][timeout:170];area["ISO3166-1"="CI"][admin_level=2]->.a;(nwr["amenity"~"^(pharmacy|hospital|clinic|doctors|dentist)$"](area.a);nwr["healthcare"](area.a););out center tags;'
code=$(curl -sS -A "$UA" -H 'Accept: application/json' -m 200 -o "$OUT/osm-sante.json" -w '%{http_code} %{size_download}' --data-urlencode "data=$Q" https://overpass-api.de/api/interpreter 2>&1); echo "osm-sante.json $code" | tee -a "$OUT/index2.txt"
gzip -9f "$OUT/osm-sante.json" || true
ls -la "$OUT"
