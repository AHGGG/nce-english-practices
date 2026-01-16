# List Dubs

GET https://api.elevenlabs.io/v1/dubbing

List the dubs you have access to.

Reference: https://elevenlabs.io/docs/api-reference/dubbing/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Dubs
  version: endpoint_dubbing.list
paths:
  /v1/dubbing:
    get:
      operationId: list
      summary: List Dubs
      description: List the dubs you have access to.
      tags:
        - - subpackage_dubbing
      parameters:
        - name: cursor
          in: query
          description: Used for fetching next page. Cursor is returned in the response.
          required: false
          schema:
            type:
              - string
              - 'null'
        - name: page_size
          in: query
          description: >-
            How many dubs to return at maximum. Can not exceed 200, defaults to
            100.
          required: false
          schema:
            type: integer
            default: 100
        - name: dubbing_status
          in: query
          description: What state the dub is currently in.
          required: false
          schema:
            $ref: '#/components/schemas/V1DubbingGetParametersDubbingStatus'
        - name: filter_by_creator
          in: query
          description: >-
            Filters who created the resources being listed, whether it was the
            user running the request or someone else that shared the resource
            with them.
          required: false
          schema:
            $ref: '#/components/schemas/V1DubbingGetParametersFilterByCreator'
        - name: order_by
          in: query
          description: The field to use for ordering results from this query.
          required: false
          schema:
            type: string
            enum:
              - type: stringLiteral
                value: created_at
        - name: order_direction
          in: query
          description: The order direction to use for results from this query.
          required: false
          schema:
            $ref: '#/components/schemas/V1DubbingGetParametersOrderDirection'
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
                $ref: '#/components/schemas/DubbingMetadataPageResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    V1DubbingGetParametersDubbingStatus:
      type: string
      enum:
        - value: dubbing
        - value: dubbed
        - value: failed
    V1DubbingGetParametersFilterByCreator:
      type: string
      enum:
        - value: personal
        - value: others
        - value: all
      default: all
    V1DubbingGetParametersOrderDirection:
      type: string
      enum:
        - value: DESCENDING
        - value: ASCENDING
      default: DESCENDING
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
    DubbingMetadataPageResponseModel:
      type: object
      properties:
        dubs:
          type: array
          items:
            $ref: '#/components/schemas/DubbingMetadataResponse'
        next_cursor:
          type:
            - string
            - 'null'
        has_more:
          type: boolean
      required:
        - dubs
        - next_cursor
        - has_more

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.dubbing.list({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.dubbing.list()

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/dubbing"

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

url = URI("https://api.elevenlabs.io/v1/dubbing")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/dubbing")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/dubbing', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/dubbing");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/dubbing")! as URL,
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