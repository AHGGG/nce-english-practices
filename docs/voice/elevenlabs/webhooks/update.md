# Update Workspace Webhook

PATCH https://api.elevenlabs.io/v1/workspace/webhooks/{webhook_id}
Content-Type: application/json

Update the specified workspace webhook

Reference: https://elevenlabs.io/docs/api-reference/webhooks/update

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Update Workspace Webhook
  version: endpoint_webhooks.update
paths:
  /v1/workspace/webhooks/{webhook_id}:
    patch:
      operationId: update
      summary: Update Workspace Webhook
      description: Update the specified workspace webhook
      tags:
        - - subpackage_webhooks
      parameters:
        - name: webhook_id
          in: path
          description: The unique ID for the webhook
          required: true
          schema:
            type: string
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
                $ref: '#/components/schemas/PatchWorkspaceWebhookResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_Update_workspace_webhook_v1_workspace_webhooks__webhook_id__patch
components:
  schemas:
    Body_Update_workspace_webhook_v1_workspace_webhooks__webhook_id__patch:
      type: object
      properties:
        is_disabled:
          type: boolean
          description: Whether to disable or enable the webhook
        name:
          type: string
          description: The display name of the webhook (used for display purposes only).
      required:
        - is_disabled
        - name
    PatchWorkspaceWebhookResponseModel:
      type: object
      properties:
        status:
          type: string
          description: >-
            The status of the workspace webhook patch request. If the request
            was successful, the status will be 'ok'. Otherwise an error message
            with status 500 will be returned.
      required:
        - status

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.webhooks.update("webhook_id", {
        isDisabled: true,
        name: "My Callback Webhook",
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.webhooks.update(
    webhook_id="webhook_id",
    is_disabled=True,
    name="My Callback Webhook"
)

```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/workspace/webhooks/webhook_id"

	payload := strings.NewReader("{\n  \"is_disabled\": true,\n  \"name\": \"My Callback Webhook\"\n}")

	req, _ := http.NewRequest("PATCH", url, payload)

	req.Header.Add("xi-api-key", "xi-api-key")
	req.Header.Add("Content-Type", "application/json")

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

url = URI("https://api.elevenlabs.io/v1/workspace/webhooks/webhook_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"is_disabled\": true,\n  \"name\": \"My Callback Webhook\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.patch("https://api.elevenlabs.io/v1/workspace/webhooks/webhook_id")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"is_disabled\": true,\n  \"name\": \"My Callback Webhook\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('PATCH', 'https://api.elevenlabs.io/v1/workspace/webhooks/webhook_id', [
  'body' => '{
  "is_disabled": true,
  "name": "My Callback Webhook"
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/workspace/webhooks/webhook_id");
var request = new RestRequest(Method.PATCH);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"is_disabled\": true,\n  \"name\": \"My Callback Webhook\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [
  "is_disabled": true,
  "name": "My Callback Webhook"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/workspace/webhooks/webhook_id")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "PATCH"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

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