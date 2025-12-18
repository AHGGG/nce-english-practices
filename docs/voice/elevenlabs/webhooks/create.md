# Create Workspace Webhook

POST https://api.elevenlabs.io/v1/workspace/webhooks
Content-Type: application/json

Create a new webhook for the workspace with the specified authentication type.

Reference: https://elevenlabs.io/docs/api-reference/webhooks/create

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create Workspace Webhook
  version: endpoint_webhooks.create
paths:
  /v1/workspace/webhooks:
    post:
      operationId: create
      summary: Create Workspace Webhook
      description: >-
        Create a new webhook for the workspace with the specified authentication
        type.
      tags:
        - - subpackage_webhooks
      parameters:
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
                $ref: '#/components/schemas/WorkspaceCreateWebhookResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_Create_workspace_webhook_v1_workspace_webhooks_post
components:
  schemas:
    WebhookHMACSettings:
      type: object
      properties:
        auth_type:
          type: string
          enum:
            - type: stringLiteral
              value: hmac
          description: The authentication type for this webhook
        name:
          type: string
          description: The display name for this webhook
        webhook_url:
          type: string
          description: >-
            The HTTPS callback URL that will be called when this webhook is
            triggered
      required:
        - auth_type
        - name
        - webhook_url
    Body_Create_workspace_webhook_v1_workspace_webhooks_post:
      type: object
      properties:
        settings:
          $ref: '#/components/schemas/WebhookHMACSettings'
          description: >-
            Webhook settings object containing auth_type and corresponding
            configuration
      required:
        - settings
    WorkspaceCreateWebhookResponseModel:
      type: object
      properties:
        webhook_id:
          type: string
        webhook_secret:
          type:
            - string
            - 'null'
      required:
        - webhook_id

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.webhooks.create({
        settings: {
            authType: "string",
            name: "string",
            webhookUrl: "string",
        },
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.webhooks.create(
    settings={
        "auth_type": "string",
        "name": "string",
        "webhook_url": "string"
    }
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

	url := "https://api.elevenlabs.io/v1/workspace/webhooks"

	payload := strings.NewReader("{\n  \"settings\": {\n    \"auth_type\": \"string\",\n    \"name\": \"string\",\n    \"webhook_url\": \"string\"\n  }\n}")

	req, _ := http.NewRequest("POST", url, payload)

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

url = URI("https://api.elevenlabs.io/v1/workspace/webhooks")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"settings\": {\n    \"auth_type\": \"string\",\n    \"name\": \"string\",\n    \"webhook_url\": \"string\"\n  }\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/workspace/webhooks")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"settings\": {\n    \"auth_type\": \"string\",\n    \"name\": \"string\",\n    \"webhook_url\": \"string\"\n  }\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/workspace/webhooks', [
  'body' => '{
  "settings": {
    "auth_type": "string",
    "name": "string",
    "webhook_url": "string"
  }
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/workspace/webhooks");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"settings\": {\n    \"auth_type\": \"string\",\n    \"name\": \"string\",\n    \"webhook_url\": \"string\"\n  }\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = ["settings": [
    "auth_type": "string",
    "name": "string",
    "webhook_url": "string"
  ]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/workspace/webhooks")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
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