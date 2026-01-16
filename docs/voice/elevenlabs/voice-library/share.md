# Add shared voice

POST https://api.elevenlabs.io/v1/voices/add/{public_user_id}/{voice_id}
Content-Type: application/json

Add a shared voice to your collection of Voices

Reference: https://elevenlabs.io/docs/api-reference/voice-library/share

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Add shared voice
  version: endpoint_voices.share
paths:
  /v1/voices/add/{public_user_id}/{voice_id}:
    post:
      operationId: share
      summary: Add shared voice
      description: Add a shared voice to your collection of Voices
      tags:
        - - subpackage_voices
      parameters:
        - name: public_user_id
          in: path
          description: Public user ID used to publicly identify ElevenLabs users.
          required: true
          schema:
            type: string
        - name: voice_id
          in: path
          description: >-
            ID of the voice to be used. You can use the [Get
            voices](/docs/api-reference/voices/search) endpoint list all the
            available voices.
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
                $ref: '#/components/schemas/AddVoiceResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_Add_shared_voice_v1_voices_add__public_user_id___voice_id__post
components:
  schemas:
    Body_Add_shared_voice_v1_voices_add__public_user_id___voice_id__post:
      type: object
      properties:
        new_name:
          type: string
          description: >-
            The name that identifies this voice. This will be displayed in the
            dropdown of the website.
      required:
        - new_name
    AddVoiceResponseModel:
      type: object
      properties:
        voice_id:
          type: string
          description: The ID of the voice.
      required:
        - voice_id

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.voices.share("public_user_id", "voice_id", {
        newName: "John Smith",
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.voices.share(
    public_user_id="public_user_id",
    voice_id="voice_id",
    new_name="John Smith"
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

	url := "https://api.elevenlabs.io/v1/voices/add/public_user_id/voice_id"

	payload := strings.NewReader("{\n  \"new_name\": \"John Smith\"\n}")

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

url = URI("https://api.elevenlabs.io/v1/voices/add/public_user_id/voice_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"new_name\": \"John Smith\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/voices/add/public_user_id/voice_id")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"new_name\": \"John Smith\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/voices/add/public_user_id/voice_id', [
  'body' => '{
  "new_name": "John Smith"
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/voices/add/public_user_id/voice_id");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"new_name\": \"John Smith\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = ["new_name": "John Smith"] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/voices/add/public_user_id/voice_id")! as URL,
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