# Get dubbing

GET https://api.elevenlabs.io/v1/dubbing/{dubbing_id}

Returns metadata about a dubbing project, including whether it's still in progress or not

Reference: https://elevenlabs.io/docs/api-reference/dubbing/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get dubbing
  version: endpoint_dubbing.get
paths:
  /v1/dubbing/{dubbing_id}:
    get:
      operationId: get
      summary: Get dubbing
      description: >-
        Returns metadata about a dubbing project, including whether it's still
        in progress or not
      tags:
        - - subpackage_dubbing
      parameters:
        - name: dubbing_id
          in: path
          description: ID of the dubbing project.
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
                $ref: '#/components/schemas/DubbingMetadataResponse'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    DubbingMediaMetadata:
      type: object
      properties:
        content_type:
          type: string
          description: The content type of the media.
        duration:
          type: number
          format: double
          description: The duration of the media in seconds.
      required:
        - content_type
        - duration
    DubbingMetadataResponse:
      type: object
      properties:
        dubbing_id:
          type: string
          description: The ID of the dubbing project.
        name:
          type: string
          description: The name of the dubbing project.
        status:
          type: string
          description: >-
            The status of the dubbing project. Either 'dubbed', 'dubbing',
            'failed', or 'cloning'.
        target_languages:
          type: array
          items:
            type: string
          description: The target languages of the dubbing project.
        editable:
          type: boolean
          default: false
          description: Whether this dubbing project is editable in Dubbing Studio.
        created_at:
          type: string
          format: date-time
          description: Timestamp this dub was created.
        media_metadata:
          oneOf:
            - $ref: '#/components/schemas/DubbingMediaMetadata'
            - type: 'null'
          description: The media metadata of the dubbing project.
        error:
          type:
            - string
            - 'null'
          description: Optional error message if the dubbing project failed.
      required:
        - dubbing_id
        - name
        - status
        - target_languages
        - created_at

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.dubbing.get("dubbing_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.dubbing.get(
    dubbing_id="dubbing_id"
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

	url := "https://api.elevenlabs.io/v1/dubbing/dubbing_id"

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

url = URI("https://api.elevenlabs.io/v1/dubbing/dubbing_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/dubbing/dubbing_id")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/dubbing/dubbing_id', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/dubbing/dubbing_id");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/dubbing/dubbing_id")! as URL,
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