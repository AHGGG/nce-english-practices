# Stream voice preview

GET https://api.elevenlabs.io/v1/text-to-voice/{generated_voice_id}/stream

Stream a voice preview that was created via the /v1/text-to-voice/design endpoint.

Reference: https://elevenlabs.io/docs/api-reference/text-to-voice/stream

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Text To Voice Preview Streaming
  version: endpoint_textToVoice/preview.stream
paths:
  /v1/text-to-voice/{generated_voice_id}/stream:
    get:
      operationId: stream
      summary: Text To Voice Preview Streaming
      description: >-
        Stream a voice preview that was created via the /v1/text-to-voice/design
        endpoint.
      tags:
        - - subpackage_textToVoice
          - subpackage_textToVoice/preview
      parameters:
        - name: generated_voice_id
          in: path
          description: The generated_voice_id to stream.
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
          description: Streaming audio data
          content:
            text/event-stream:
              schema:
                type: string
                format: binary
        '422':
          description: Validation Error
          content: {}

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.textToVoice.preview.stream("generated_voice_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.text_to_voice.preview.stream(
    generated_voice_id="generated_voice_id"
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

	url := "https://api.elevenlabs.io/v1/text-to-voice/generated_voice_id/stream"

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

url = URI("https://api.elevenlabs.io/v1/text-to-voice/generated_voice_id/stream")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/text-to-voice/generated_voice_id/stream")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/text-to-voice/generated_voice_id/stream', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/text-to-voice/generated_voice_id/stream");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/text-to-voice/generated_voice_id/stream")! as URL,
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