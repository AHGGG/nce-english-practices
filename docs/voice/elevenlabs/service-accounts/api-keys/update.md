# Update API key

PATCH https://api.elevenlabs.io/v1/service-accounts/{service_account_user_id}/api-keys/{api_key_id}
Content-Type: application/json

Update an existing API key for a service account

Reference: https://elevenlabs.io/docs/api-reference/service-accounts/api-keys/update

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Update API key
  version: endpoint_serviceAccounts/apiKeys.update
paths:
  /v1/service-accounts/{service_account_user_id}/api-keys/{api_key_id}:
    patch:
      operationId: update
      summary: Update API key
      description: Update an existing API key for a service account
      tags:
        - - subpackage_serviceAccounts
          - subpackage_serviceAccounts/apiKeys
      parameters:
        - name: service_account_user_id
          in: path
          required: true
          schema:
            type: string
        - name: api_key_id
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
                description: Any type
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_edit_service_account_api_key_v1_service_accounts__service_account_user_id__api_keys__api_key_id__patch
components:
  schemas:
    BodyEditServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysApiKeyIdPatchPermissionsOneOf0Items:
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
    BodyEditServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysApiKeyIdPatchPermissions0:
      type: array
      items:
        $ref: >-
          #/components/schemas/BodyEditServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysApiKeyIdPatchPermissionsOneOf0Items
    BodyEditServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysApiKeyIdPatchPermissions:
      oneOf:
        - $ref: >-
            #/components/schemas/BodyEditServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysApiKeyIdPatchPermissions0
        - type: string
          enum:
            - type: stringLiteral
              value: all
    Body_edit_service_account_api_key_v1_service_accounts__service_account_user_id__api_keys__api_key_id__patch:
      type: object
      properties:
        is_enabled:
          type: boolean
          description: Whether to enable or disable the API key.
        name:
          type: string
          description: >-
            The name of the XI API key to use (used for identification purposes
            only).
        permissions:
          $ref: >-
            #/components/schemas/BodyEditServiceAccountApiKeyV1ServiceAccountsServiceAccountUserIdApiKeysApiKeyIdPatchPermissions
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
        - is_enabled
        - name
        - permissions

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.serviceAccounts.apiKeys.update("service_account_user_id", "api_key_id", {
        isEnabled: true,
        name: "Sneaky Fox",
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

client.service_accounts.api_keys.update(
    service_account_user_id="service_account_user_id",
    api_key_id="api_key_id",
    is_enabled=True,
    name="Sneaky Fox",
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

	url := "https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys/api_key_id"

	payload := strings.NewReader("{\n  \"is_enabled\": true,\n  \"name\": \"Sneaky Fox\",\n  \"permissions\": [\n    \"text_to_speech\"\n  ]\n}")

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

url = URI("https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys/api_key_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"is_enabled\": true,\n  \"name\": \"Sneaky Fox\",\n  \"permissions\": [\n    \"text_to_speech\"\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.patch("https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys/api_key_id")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"is_enabled\": true,\n  \"name\": \"Sneaky Fox\",\n  \"permissions\": [\n    \"text_to_speech\"\n  ]\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('PATCH', 'https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys/api_key_id', [
  'body' => '{
  "is_enabled": true,
  "name": "Sneaky Fox",
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
var client = new RestClient("https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys/api_key_id");
var request = new RestRequest(Method.PATCH);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"is_enabled\": true,\n  \"name\": \"Sneaky Fox\",\n  \"permissions\": [\n    \"text_to_speech\"\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [
  "is_enabled": true,
  "name": "Sneaky Fox",
  "permissions": ["text_to_speech"]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/service-accounts/service_account_user_id/api-keys/api_key_id")! as URL,
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