# Create API key

POST https://api.elevenlabs.io/v1/service-accounts/{service_account_user_id}/api-keys
Content-Type: application/json

Create a new API key for a service account

Reference: https://elevenlabs.io/docs/api-reference/service-accounts/api-keys/create

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create API key
  version: endpoint_serviceAccounts/apiKeys.create
paths:
  /v1/service-accounts/{service_account_user_id}/api-keys:
    post:
      operationId: create
      summary: Create API key
      description: Create a new API key for a service account
      tags:
        - - subpackage_serviceAccounts
          - subpackage_serviceAccounts/apiKeys
      parameters:
        - name: service_account_user_id
          in: path
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
                $ref: '#/components/schemas/WorkspaceCreateApiKeyResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_create_service_account_api_key_v1_service_accounts__service_account_user_id__api_keys_post
components:
  schemas:
    BodyCreateServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysPostPermissionsOneOf0Items:
      type: string
      enum:
        - value: text_to_speech
        - value: speech_to_speech
        - value: speech_to_text
        - value: models_read
        - value: models_write
        - value: voices_read
        - value: voices_write
        - value: speech_history_read
        - value: speech_history_write
        - value: sound_generation
        - value: audio_isolation
        - value: voice_generation
        - value: dubbing_read
        - value: dubbing_write
        - value: pronunciation_dictionaries_read
        - value: pronunciation_dictionaries_write
        - value: user_read
        - value: user_write
        - value: projects_read
        - value: projects_write
        - value: audio_native_read
        - value: audio_native_write
        - value: workspace_read
        - value: workspace_write
        - value: forced_alignment
        - value: convai_read
        - value: convai_write
        - value: music_generation
    BodyCreateServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysPostPermissions0:
      type: array
      items:
        $ref: >-
          #/components/schemas/BodyCreateServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysPostPermissionsOneOf0Items
    BodyCreateServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysPostPermissions:
      oneOf:
        - $ref: >-
            #/components/schemas/BodyCreateServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysPostPermissions0
        - type: string
          enum:
            - type: stringLiteral
              value: all
    Body_create_service_account_api_key_v1_service_accounts__service_account_user_id__api_keys_post:
      type: object
      properties:
        name:
          type: string
        permissions:
          $ref: >-
            #/components/schemas/BodyCreateServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysPostPermissions
          description: The permissions of the XI API.
        character_limit:
          type:
            - integer
            - 'null'
          description: >-
            The character limit of the XI API key. If provided this will limit
            the usage of this api key to n characters per month where n is the
            chosen value. Requests that incur charges will fail after reaching
            this monthly limit.
      required:
        - name
        - permissions
    WorkspaceCreateApiKeyResponseModel:
      type: object
      properties:
        xi-api-key:
          type: string
        key_id:
          type: string
      required:
        - xi-api-key
        - key_id

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.serviceAccounts.apiKeys.create("service_account_user_id", {
        name: "string",
        permissions: [
            "text_to_speech",
        ],
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.service_accounts.api_keys.create(
    service_account_user_id="service_account_user_id",
    name="string",
    permissions=[
        "text_to_speech"
    ]
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

	url := "https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys"

	payload := strings.NewReader("{\n  \"name\": \"string\",\n  \"permissions\": [\n    \"text_to_speech\"\n  ]\n}")

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

url = URI("https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"name\": \"string\",\n  \"permissions\": [\n    \"text_to_speech\"\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"name\": \"string\",\n  \"permissions\": [\n    \"text_to_speech\"\n  ]\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys', [
  'body' => '{
  "name": "string",
  "permissions": [
    "text_to_speech"
  ]
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"name\": \"string\",\n  \"permissions\": [\n    \"text_to_speech\"\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [
  "name": "string",
  "permissions": ["text_to_speech"]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys")! as URL,
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