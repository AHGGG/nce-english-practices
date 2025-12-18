# Audio isolation

POST https://api.elevenlabs.io/v1/audio-isolation
Content-Type: multipart/form-data

Removes background noise from audio.

Reference: https://elevenlabs.io/docs/api-reference/audio-isolation/convert

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Audio isolation
  version: endpoint_audioIsolation.convert
paths:
  /v1/audio-isolation:
    post:
      operationId: convert
      summary: Audio isolation
      description: Removes background noise from audio.
      tags:
        - - subpackage_audioIsolation
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
                $ref: '#/components/schemas/audio_isolation_convert_Response_200'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                audio:
                  type: string
                  format: binary
                  description: >-
                    The audio file from which vocals/speech will be isolated
                    from.
                file_format:
                  oneOf:
                    - $ref: >-
                        #/components/schemas/V1AudioIsolationPostRequestBodyContentMultipartFormDataSchemaFileFormat
                    - type: 'null'
                  description: >-
                    The format of input audio. Options are 'pcm_s16le_16' or
                    'other' For `pcm_s16le_16`, the input audio must be 16-bit
                    PCM at a 16kHz sample rate, single channel (mono), and
                    little-endian byte order. Latency will be lower than with
                    passing an encoded waveform.
                preview_b64:
                  type:
                    - string
                    - 'null'
                  description: Optional preview image base64 for tracking this generation.
              required:
                - audio
components:
  schemas:
    V1AudioIsolationPostRequestBodyContentMultipartFormDataSchemaFileFormat:
      type: string
      enum:
        - value: pcm_s16le_16
        - value: other
      default: other
    audio_isolation_convert_Response_200:
      type: object
      properties: {}

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.audioIsolation.convert({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.audio_isolation.convert()

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

	url := "https://api.elevenlabs.io/v1/audio-isolation"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"preview_b64\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("xi-api-key", "xi-api-key")
	req.Header.Add("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")

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

url = URI("https://api.elevenlabs.io/v1/audio-isolation")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"preview_b64\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/audio-isolation")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"preview_b64\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/audio-isolation', [
  'multipart' => [
    [
        'name' => 'audio',
        'filename' => 'string',
        'contents' => null
    ]
  ]
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/audio-isolation");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"preview_b64\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "multipart/form-data; boundary=---011000010111000001101001"
]
let parameters = [
  [
    "name": "audio",
    "fileName": "string"
  ],
  [
    "name": "file_format",
    "value": 
  ],
  [
    "name": "preview_b64",
    "value": 
  ]
]

let boundary = "---011000010111000001101001"

var body = ""
var error: NSError? = nil
for param in parameters {
  let paramName = param["name"]!
  body += "--\(boundary)\r\n"
  body += "Content-Disposition:form-data; name=\"\(paramName)\""
  if let filename = param["fileName"] {
    let contentType = param["content-type"]!
    let fileContent = String(contentsOfFile: filename, encoding: String.Encoding.utf8)
    if (error != nil) {
      print(error as Any)
    }
    body += "; filename=\"\(filename)\"\r\n"
    body += "Content-Type: \(contentType)\r\n\r\n"
    body += fileContent
  } else if let paramValue = param["value"] {
    body += "\r\n\r\n\(paramValue)"
  }
}

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/audio-isolation")! as URL,
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