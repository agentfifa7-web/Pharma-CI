#!/usr/bin/env bash
set -u
OUT=probe-out; mkdir -p "$OUT"
UA='PHARMA-CI-sync/1.0 (+https://github.com/agentfifa7-web/pharma-ci)'
fetch() { code=$(curl -sSL -A "$UA" -m 120 -o "$OUT/$1" -w '%{http_code} %{size_download} %{url_effective}' "$2" 2>&1); echo "$1 $code" | tee -a "$OUT/index3.txt"; }
for f in axios-Dd3iwNfI OfficinesPage-BtdnH_tW MedicationsProductsPage-DPWgaE6f PostsPage-BN1w1yIU PostPage-BtZ8X0JY HomePage-CefQZPI2 HealthProductsPage-D72P1qJZ EstablishmentsPage-D6GgcFrO; do fetch "airp-$f.js" "https://airp.ci/assets/$f.js"; done
