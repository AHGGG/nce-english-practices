# Create Single Use Token

POST https://api.elevenlabs.io/v1/single-use-token/{token_type}

Generate a time limited single-use token with embedded authentication for frontend clients.

Reference: https://elevenlabs.io/docs/api-reference/single-use/create

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create Single Use Token
  version: endpoint_tokens/singleUse.create
paths:
  /v1/single-use-token/{token_type}:
    post:
      operationId: create
      summary: Create Single Use Token
      description: >-
        Generate a time limited single-use token with embedded authentication
        for frontend clients.
      tags:
        - - subpackage_tokens
          - subpackage_tokens/singleUse
      parameters:
        - name: token_type
          in: path
          required: true
          schema:
            $ref: '#/components/schemas/SingleUseTokenType'
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
                $ref: '#/components/schemas/SingleUseTokenResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    SingleUseTokenType:
      type: string
      enum:
        - value: realtime_scribe
        - value: tts_websocket
    SingleUseTokenResponseModel:
      type: object
      properties:
        token:
          type: string
          description: >-
            A time bound single use token that expires after 15 minutes. Will be
            consumed on use.
      required:
        - token

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.tokens.singleUse.create("realtime_scribe");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.tokens.single_use.create(
    token_type="realtime_scribe"
)

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe"

	req, _ := http.NewRequest("POST", url, nil)

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

url = URI("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
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