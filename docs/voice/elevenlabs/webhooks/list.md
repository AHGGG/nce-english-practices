# List Workspace Webhooks

GET https://api.elevenlabs.io/v1/workspace/webhooks

List all webhooks for a workspace

Reference: https://elevenlabs.io/docs/api-reference/webhooks/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Workspace Webhooks
  version: endpoint_webhooks.list
paths:
  /v1/workspace/webhooks:
    get:
      operationId: list
      summary: List Workspace Webhooks
      description: List all webhooks for a workspace
      tags:
        - - subpackage_webhooks
      parameters:
        - name: include_usages
          in: query
          description: >-
            Whether to include active usages of the webhook, only usable by
            admins
          required: false
          schema:
            type: boolean
            default: false
        - name: xi-api-key
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkspaceWebhookListResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    WebhookAuthMethodType:
      type: string
      enum:
        - value: hmac
        - value: oauth2
        - value: mtls
    WebhookUsageType:
      type: string
      enum:
        - value: ConvAI Agent Settings
        - value: ConvAI Settings
        - value: Voice Library Removal Notices
        - value: Speech to Text
    WorkspaceWebhookUsageResponseModel:
      type: object
      properties:
        usage_type:
          $ref: '#/components/schemas/WebhookUsageType'
      required:
        - usage_type
    WorkspaceWebhookResponseModel:
      type: object
      properties:
        name:
          type: string
          description: The display name for this webhook.
        webhook_id:
          type: string
          description: The unique ID for this webhook.
        webhook_url:
          type: string
          description: >-
            The HTTPS callback URL that is called when this webhook is triggered
            in the platform.
        is_disabled:
          type: boolean
          description: Whether the webhook has been manually disabled by a user.
        is_auto_disabled:
          type: boolean
          description: >-
            Whether the webhook has been automatically disabled due to repeated
            consecutive failures over a long period of time.
        created_at_unix:
          type: integer
          description: Original creation time of the webhook.
        auth_type:
          $ref: '#/components/schemas/WebhookAuthMethodType'
          description: The authentication mode used to secure the webhook.
        usage:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/WorkspaceWebhookUsageResponseModel'
          description: >-
            The list of products that are currently configured to trigger this
            webhook.
        most_recent_failure_error_code:
          type:
            - integer
            - 'null'
          description: The most recent error code returned from the callback URL.
        most_recent_failure_timestamp:
          type:
            - integer
            - 'null'
          description: >-
            The most recent time the webhook failed, failures are any non-200
            codes returned by the callback URL.
      required:
        - name
        - webhook_id
        - webhook_url
        - is_disabled
        - is_auto_disabled
        - created_at_unix
        - auth_type
    WorkspaceWebhookListResponseModel:
      type: object
      properties:
        webhooks:
          type: array
          items:
            $ref: '#/components/schemas/WorkspaceWebhookResponseModel'
          description: List of webhooks currently configured for the workspace
      required:
        - webhooks

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.webhooks.list({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.webhooks.list()

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/workspace/webhooks"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("xi-api-key", "xi-api-key")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.elevenlabs.io/v1/workspace/webhooks")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/workspace/webhooks")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/workspace/webhooks', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/workspace/webhooks");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/workspace/webhooks")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```