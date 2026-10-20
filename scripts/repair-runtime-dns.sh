set -eu

if [ ! -e /etc/resolv.conf ] && [ -L /etc/resolv.conf ]; then
  case "$(readlink /etc/resolv.conf)" in
    ../run/systemd/resolve/stub-resolv.conf|/run/systemd/resolve/stub-resolv.conf)
      temporary=$(mktemp /etc/orai-resolv.XXXXXX)
      trap 'rm -f "$temporary"' EXIT
      printf 'nameserver 1.1.1.1\nnameserver 8.8.8.8\noptions timeout:2 attempts:2\n' > "$temporary"
      chmod 644 "$temporary"
      mv -T "$temporary" /etc/resolv.conf
      printf 'Repaired the project VM resolver.\n'
      ;;
    *) printf 'Unsupported missing guest DNS configuration; inspect the project VM.\n' >&2; exit 1 ;;
  esac
fi

# This VM resolves directly through its configured upstream DNS. Its unused
# default dnsmasq service otherwise gets forwarded to the host by Lima.
if command -v dnsmasq > /dev/null 2>&1 &&
  (systemctl is-enabled --quiet dnsmasq || systemctl is-active --quiet dnsmasq); then
  systemctl disable --now dnsmasq
fi

test -r /etc/resolv.conf
