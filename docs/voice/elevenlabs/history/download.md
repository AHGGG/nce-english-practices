# Download history items

POST https://api.elevenlabs.io/v1/history/download
Content-Type: application/json

Download one or more history items. If one history item ID is provided, we will return a single audio file. If more than one history item IDs are provided, we will provide the history items packed into a .zip file.

Reference: https://elevenlabs.io/docs/api-reference/history/download

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Download history items
  version: endpoint_history.download
paths:
  /v1/history/download:
    post:
      operationId: download
      summary: Download history items
      description: >-
        Download one or more history items. If one history item ID is provided,
        we will return a single audio file. If more than one history item IDs
        are provided, we will provide the history items packed into a .zip file.
      tags:
        - - subpackage_history
      parameters:
        - name: xi-api-key
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: >-
            The requested audio file, or a zip file containing multiple audio
            files when multiple history items are requested.
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
        '400':
          description: Invalid request
          content: {}
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_Download_history_items_v1_history_download_post
components:
  schemas:
    Body_Download_history_items_v1_history_download_post:
      type: object
      properties:
        history_item_ids:
          type: array
          items:
            type: string
          description: >-
            A list of history items to download, you can get IDs of history
            items and other metadata using the GET
            https://api.elevenlabs.io/v1/history endpoint.
        output_format:
          type:
            - string
            - 'null'
          description: Output format to transcode the audio file, can be wav or default.
      required:
        - history_item_ids

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.history.download({
        historyItemIds: [
            "string",
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

client.history.download(
    history_item_ids=[
        "string"
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

	url := "https://api.elevenlabs.io/v1/history/download"

	payload := strings.NewReader("{\n  \"history_item_ids\": [\n    \"string\"\n  ]\n}")

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

url = URI("https://api.elevenlabs.io/v1/history/download")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"history_item_ids\": [\n    \"string\"\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/history/download")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"history_item_ids\": [\n    \"string\"\n  ]\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/history/download', [
  'body' => '{
  "history_item_ids": [
    "string"
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
var client = new RestClient("https://api.elevenlabs.io/v1/history/download");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"history_item_ids\": [\n    \"string\"\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = ["history_item_ids": ["string"]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/history/download")! as URL,
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