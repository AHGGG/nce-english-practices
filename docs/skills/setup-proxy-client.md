# Setup Standalone Proxy Client (VLESS/Xray)

> **Goal**: Deploy a lightweight VLESS client on your server to act as a gateway for the application to access restricted content (RSS/Audio).
> **Philosophy**: Decoupled architecture. The proxy runs independently; the application connects to it via standard SOCKS5/HTTP.

## 1. Directory Setup

On your server, create a directory for the proxy service (outside the project folder):

```bash
mkdir -p /opt/proxy-client
cd /opt/proxy-client
```

## 2. Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  xray:
    image: teddysun/xray:latest
    container_name: proxy-client
    restart: always
    volumes:
      - ./config.json:/etc/xray/config.json
    ports:
      # Expose SOCKS5 port
      # 0.0.0.0 is required so other Docker containers (like nce-app) can access it
      - "0.0.0.0:7890:1080"
      # Expose HTTP port (optional)
      - "0.0.0.0:7891:1081"
```

## 3. Xray Configuration (VLESS Template)

Create `config.json`. **You must replace the placeholders** with your 3x-ui VLESS node information.

```json
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": 1080,
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls"]
      }
    },
    {
      "port": 1081,
      "protocol": "http",
      "settings": {}
    }
  ],
  "outbounds": [
    {
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "YOUR_SERVER_IP",
            "port": 443,
            "users": [
              {
                "id": "YOUR_UUID_HERE",
                "encryption": "none",
                "flow": "xtls-rprx-vision"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "fingerprint": "chrome",
          "serverName": "yahoo.com",
          "publicKey": "YOUR_PUBLIC_KEY_HERE",
          "shortId": "YOUR_SHORT_ID_HERE",
          "spiderX": ""
        }
      }
    },
    {
      "protocol": "freedom",
      "tag": "direct"
    }
  ],
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "type": "field",
        "ip": ["geoip:private"],
        "outboundTag": "direct"
      }
    ]
  }
}
```

> **Tip**: If your 3x-ui setting is different (e.g., using WS or GRPC instead of Reality/TCP), adjust the `streamSettings` accordingly. The easiest way is to export the "Xray Configuration" directly from your 3x-ui panel if supported, or use a tool to convert your VLESS link to JSON.

## 4. Start the Proxy

```bash
docker compose up -d
```

Verify it's running:
```bash
docker logs proxy-client
# Should see "Xray ... started"
```

## 5. Configure the Application

Now, connect the `nce-english-practices` application to this proxy.

Since the proxy is running on the host machine (mapped to port 7890) and the app is in a Docker container, you need to use the Docker Host IP.

**In Linux Docker**, the host IP is typically `172.17.0.1` (the default gateway).

Edit your project's `deploy/.env`:

```bash
# SOCKS5 is recommended
PROXY_URL=socks5://172.17.0.1:7890

# Or HTTP
# PROXY_URL=http://172.17.0.1:7891
```

**Restart the application:**

```bash
cd /path/to/nce-english-practices/deploy
./scripts/deploy.sh
```

## Troubleshooting

1.  **Connectivity Check**:
    Inside the app container, verify you can reach the proxy:
    ```bash
    docker exec -it nce-english-practices-app-1 curl -v telnet://172.17.0.1:7890
    ```
    If it connects, the network path is open.

2.  **Proxy Functionality**:
    Verify the proxy actually works (on the host):
    ```bash
    curl -x socks5://127.0.0.1:7890 https://www.google.com
    ```
