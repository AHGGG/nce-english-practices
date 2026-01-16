# Get service accounts

GET https://api.elevenlabs.io/v1/service-accounts

List all service accounts in the workspace

Reference: https://elevenlabs.io/docs/api-reference/service-accounts/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get service accounts
  version: endpoint_serviceAccounts.list
paths:
  /v1/service-accounts:
    get:
      operationId: list
      summary: Get service accounts
      description: List all service accounts in the workspace
      tags:
        - - subpackage_serviceAccounts
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
                $ref: '#/components/schemas/WorkspaceServiceAccountListResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    WorkspaceApiKeyResponseModelPermissionsItems:
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
    WorkspaceApiKeyResponseModel:
      type: object
      properties:
        name:
          type: string
        hint:
          type: string
        key_id:
          type: string
        service_account_user_id:
          type: string
        created_at_unix:
          type:
            - integer
            - 'null'
        is_disabled:
          type: boolean
          default: false
        permissions:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/WorkspaceApiKeyResponseModelPermissionsItems'
        character_limit:
          type:
            - integer
            - 'null'
        character_count:
          type:
            - integer
            - 'null'
      required:
        - name
        - hint
        - key_id
        - service_account_user_id
    WorkspaceServiceAccountResponseModel:
      type: object
      properties:
        service_account_user_id:
          type: string
        name:
          type: string
        created_at_unix:
          type:
            - integer
            - 'null'
        api-keys:
          type: array
          items:
            $ref: '#/components/schemas/WorkspaceApiKeyResponseModel'
      required:
        - service_account_user_id
        - name
        - api-keys
    WorkspaceServiceAccountListResponseModel:
      type: object
      properties:
        service-accounts:
          type: array
          items:
            $ref: '#/components/schemas/WorkspaceServiceAccountResponseModel'
      required:
        - service-accounts

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.serviceAccounts.list();
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.service_accounts.list()

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/service-accounts"

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

url = URI("https://api.elevenlabs.io/v1/service-accounts")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/service-accounts")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/service-accounts', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/service-accounts");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/service-accounts")! as URL,
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