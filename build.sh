#!/usr/bin/env bash
# Injects shared partials (header / footer / enquiry modal) into every page and
# normalises every internal path for the chosen deployment target.
#
# build.sh is the single place that owns path resolution. Partials and pages are
# rewritten on every run, so this is idempotent — run it as often as you like.
#
#   bash build.sh                     Portable relative paths (DEFAULT).
#                                     Works by double-clicking a file, on any
#                                     server, and in a subfolder / GitHub Pages
#                                     project site. Use this unless you know
#                                     you're deploying to a domain root.
#
#   bash build.sh --base=/            Root-relative (/assets/...). Correct only
#                                     when the site is served from a domain root.
#                                     Will NOT work by double-clicking a file.
#
#   bash build.sh --base=/my-repo/    Fixed base for a known subdirectory.
#
set -euo pipefail
cd "$(dirname "$0")"

FIXED_BASE=""
for arg in "$@"; do
  case "$arg" in
    --base=*) FIXED_BASE="${arg#--base=}" ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

PAGES=$(find . -name "*.html" -not -path "./partials/*" | sed 's|^\./||')

inject() { # <file> <marker> <content-file>
  MARKER="$2" CONTENT="$3" perl -0777 -i -pe '
    BEGIN {
      local $/;
      open(my $fh, "<", $ENV{CONTENT}) or die "missing $ENV{CONTENT}";
      $repl = <$fh>;
      $m = $ENV{MARKER};
      $block = "<!-- \@$m -->\n$repl<!-- \@/$m -->";
    }
    s{<!-- \@\Q$m\E -->.*?<!-- \@/\Q$m\E -->}{$block}s;
  ' "$1"
}

for f in $PAGES; do
  # ---- Work out this page's base prefix ----
  if [ -n "$FIXED_BASE" ]; then
    BASE="$FIXED_BASE"
  else
    case "$f" in
      */*) BASE="../" ;;   # one folder deep (care/, services/)
      *)   BASE="" ;;      # site root
    esac
  fi

  # ---- Which primary nav item is current ----
  case "$f" in
    services.html|services/*)              ACTIVE="services" ;;
    booking.html|book-appointment.html)    ACTIVE="booking" ;;
    care/*|hair-care-hub.html|team.html)   ACTIVE="care" ;;
    stylists.html)                         ACTIVE="work" ;;
    visit-us.html)                         ACTIVE="visit" ;;
    *)                                     ACTIVE="" ;;
  esac

  inject "$f" header partials/header.html
  inject "$f" footer partials/footer.html
  inject "$f" modal  partials/modal.html

  # ---- Normalise every internal path to BASE ----
  # Matches whatever prefix is currently there (/, ../, or none) and replaces it,
  # which is what makes re-running this safe.
  # $P matches whatever base is currently present: none, ../ repeats, or an
  # absolute base with any number of segments (/ or /repo-name/). Matching all
  # three is what lets you switch between modes and re-run safely.
  #
  # Each rule writes a \x01 sentinel instead of the real base, so a later rule
  # can't re-match and mangle an already-normalised path. (Without this the root
  # page rule eats the folder from /care/index.html and breaks the link.)
  BASE="$BASE" perl -0777 -i -pe '
    my $b = $ENV{BASE};
    my $P = qr{(?:(?:\.\./)+|/(?:[A-Za-z0-9._-]+/)*)?};
    s{href="$P((?:care|services)/[A-Za-z0-9._-]+\.html)}{href="\x01$1}g;
    s{href="$P((?:index|services|booking|book-appointment|visit-us|stylists|team|hair-care-hub)\.html)}{href="\x01$1}g;
    s{(href|src)="$P(assets/)}{$1="\x01$2}g;
    s{\x01}{$b}g;
  ' "$f"

  if [ -n "$ACTIVE" ]; then
    # /g matters: the same data-nav key now appears in the header nav and again
    # in the vertical rail, and both need marking.
    ACTIVE="$ACTIVE" perl -0777 -i -pe 's/data-nav="\Q$ENV{ACTIVE}\E"/data-nav="$ENV{ACTIVE}" data-active="1"/g' "$f"
  fi

  echo "  built $f  (base: '${BASE:-<relative>}')"
done

echo "Done."
