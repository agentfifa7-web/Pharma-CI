#!/usr/bin/env bash
set -u
OUT=probe-out; mkdir -p "$OUT"
UA='PHARMA-CI-sync/1.0 (+https://github.com/agentfifa7-web/pharma-ci)'
fetch() { code=$(curl -sSL -A "$UA" -H 'Accept: application/json, text/html, */*' -m 120 -o "$OUT/$1" -w '%{http_code} %{size_download} %{url_effective}' "$2" 2>&1); echo "$1 $code" | tee -a "$OUT/index4.txt"; }
A=https://api.airpdigital.com/api
fetch api-officines.json "$A/data/officines?page=1&rowsPerPage=50&sortBy=id&descending=false"
fetch api-officines-big.json "$A/data/officines?page=1&rowsPerPage=5000&sortBy=id&descending=false"
fetch api-medications.json "$A/data/medications?page=1&rowsPerPage=50&sortBy=id&descending=false"
fetch api-medications-latest.json "$A/data/medications/latest-update"
fetch api-healthproducts.json "$A/data/healthproducts?page=1&rowsPerPage=20"
fetch api-data.json "$A/data"
for p in posts "posts?type=actualites" "posts?page=1&rowsPerPage=20&type=communiques" articles alerts communiques; do n=$(echo "$p" | tr '?=&/' '____'); fetch "api-$n.json" "$A/$p"; done
fetch airp-Newsletter.js 'https://airp.ci/assets/Newsletter-BNsv9-f-.js'
fetch airp-MainLayout.js 'https://airp.ci/assets/MainLayout-BUK5fcQP.js'
fetch aip-sante-feed.xml 'https://www.aip.ci/category/sante/feed/'
fetch ordre-feed.xml 'https://ordrepharmacien.ci/feed/'
fetch ordre-communiques-feed.xml 'https://ordrepharmacien.ci/category/communiques/feed/'
fetch sante-actu1.html 'https://www.sante.gouv.ci/actualites/1'
fetch sante-actu3.html 'https://www.sante.gouv.ci/actualites/3'
