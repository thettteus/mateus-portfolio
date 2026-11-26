#!/bin/sh
# Renders scripts/og/og.html to public/og.png (1200x630) with the system
# Chrome, so the card uses the site's own font, photo and icons.
#   sh scripts/og/make-og-image.sh
set -e
cd "$(dirname "$0")/../.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --virtual-time-budget=2000 \
  --screenshot="$PWD/public/og.png" "file://$PWD/scripts/og/og.html" 2>/dev/null
echo "wrote public/og.png"
