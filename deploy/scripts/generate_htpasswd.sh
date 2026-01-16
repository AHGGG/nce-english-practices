#!/bin/bash
set -e

# Generate .htpasswd for Basic Auth
# Usage: ./generate_htpasswd.sh <username> <password>
# Example: ./generate_htpasswd.sh admin mySecretPassword123

USERNAME="${1:-admin}"
PASSWORD="${2:-changeme}"

HTPASSWD_FILE="$(dirname "$0")/../nginx/conf.d/.htpasswd"
mkdir -p "$(dirname "$HTPASSWD_FILE")"

# Generate password hash (using openssl, available in most systems)
HASH=$(openssl passwd -apr1 "$PASSWORD")
echo "$USERNAME:$HASH" > "$HTPASSWD_FILE"

echo "Generated .htpasswd file at: $HTPASSWD_FILE"
echo "Username: $USERNAME"
echo "Password: $PASSWORD"
echo ""
echo "IMPORTANT: Change the default password before deploying!"
