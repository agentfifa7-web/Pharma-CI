#!/usr/bin/env bash
# Télécharge une copie brute des sources candidates pour écrire les parseurs (temporaire).
set -u
OUT=probe-out; mkdir -p "$OUT"
UA='PHARMA-CI-sync/1.0 (+https://github.com/agentfifa7-web/pharma-ci)'
fetch() { # nom url
  code=$(curl -sSL -A "$UA" -m 120 -o "$OUT/$1" -w '%{http_code} %{size_download} %{url_effective}' "$2" 2>&1)
  echo "$1 $code" | tee -a "$OUT/index.txt"
}
fetch dgcmu-medicaments.html 'https://dg-cmu.ci/liste-des-actes-medicaux-couverts-par-la-cmu/'
fetch dgcmu-home.html 'https://dg-cmu.ci/'
fetch npsp-cmu.pdf 'http://www.npsp.ci/redirect/backoffice/files/uploads/A5-LISTE%20DES%20MEDICAMENTS%20CMU%20AVEC%20REFERENCES%20COMMERCIALES.PDF'
fetch npsp-home.html 'https://www.npsp.ci/'
fetch ipscnam-home.html 'https://www.ipscnam.ci/'
fetch airp-home.html 'https://www.airp.ci/'
fetch airp-feed.xml 'https://www.airp.ci/feed/'
fetch airp-wpjson.json 'https://www.airp.ci/wp-json/wp/v2/posts?per_page=20'
fetch sante-home.html 'https://www.sante.gouv.ci/'
fetch sante-feed.xml 'https://www.sante.gouv.ci/feed/'
fetch gouv-home.html 'https://www.gouv.ci/'
fetch aip-feed.xml 'https://www.aip.ci/feed/'
fetch aip-sante.html 'https://www.aip.ci/category/sante/'
fetch who-alerts.html 'https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts'
fetch who-afro-ci.html 'https://www.afro.who.int/fr/countries/cote-divoire/news'
fetch depps-home.html 'https://www.depps.sante.gouv.ci/'
Q='[out:json][timeout:120];area["ISO3166-1"="CI"][admin_level=2]->.a;(nwr["amenity"~"^(pharmacy|hospital|clinic|doctors|dentist)$"](area.a);nwr["healthcare"](area.a););out center tags;'
code=$(curl -sS -m 180 -o "$OUT/osm-sante.json" -w '%{http_code} %{size_download}' --data-urlencode "data=$Q" https://overpass-api.de/api/interpreter 2>&1); echo "osm-sante.json $code" | tee -a "$OUT/index.txt"
gzip -9 "$OUT/osm-sante.json" || true
ls -la "$OUT"
