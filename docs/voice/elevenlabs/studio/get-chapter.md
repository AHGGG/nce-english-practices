# Get Chapter

GET https://api.elevenlabs.io/v1/studio/projects/{project_id}/chapters/{chapter_id}

Returns information about a specific chapter.

Reference: https://elevenlabs.io/docs/api-reference/studio/get-chapter

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Chapter
  version: endpoint_studio/projects/chapters.get
paths:
  /v1/studio/projects/{project_id}/chapters/{chapter_id}:
    get:
      operationId: get
      summary: Get Chapter
      description: Returns information about a specific chapter.
      tags:
        - - subpackage_studio
          - subpackage_studio/projects
          - subpackage_studio/projects/chapters
      parameters:
        - name: project_id
          in: path
          description: >-
            The ID of the project to be used. You can use the [List
            projects](/docs/api-reference/studio/get-projects) endpoint to list
            all the available projects.
          required: true
          schema:
            type: string
        - name: chapter_id
          in: path
          description: >-
            The ID of the chapter to be used. You can use the [List project
            chapters](/docs/api-reference/studio/get-chapters) endpoint to list
            all the available chapters.
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
                $ref: '#/components/schemas/ChapterWithContentResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ChapterWithContentResponseModelState:
      type: string
      enum:
        - value: default
        - value: converting
    ChapterStatisticsResponseModel:
      type: object
      properties:
        characters_unconverted:
          type: integer
          description: The number of unconverted characters.
        characters_converted:
          type: integer
          description: The number of converted characters.
        paragraphs_converted:
          type: integer
          description: The number of converted paragraphs.
        paragraphs_unconverted:
          type: integer
          description: The number of unconverted paragraphs.
      required:
        - characters_unconverted
        - characters_converted
        - paragraphs_converted
        - paragraphs_unconverted
    ChapterContentBlockTtsNodeResponseModel:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: tts_node
        voice_id:
          type: string
        text:
          type: string
      required:
        - type
        - voice_id
        - text
    ChapterContentBlockExtendableNodeResponseModel:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: _other
      required:
        - type
    ChapterContentBlockResponseModelNodesItems:
      oneOf:
        - $ref: '#/components/schemas/ChapterContentBlockTtsNodeResponseModel'
        - $ref: '#/components/schemas/ChapterContentBlockExtendableNodeResponseModel'
    ChapterContentBlockResponseModel:
      type: object
      properties:
        block_id:
          type: string
        nodes:
          type: array
          items:
            $ref: '#/components/schemas/ChapterContentBlockResponseModelNodesItems'
      required:
        - block_id
        - nodes
    ChapterContentResponseModel:
      type: object
      properties:
        blocks:
          type: array
          items:
            $ref: '#/components/schemas/ChapterContentBlockResponseModel'
      required:
        - blocks
    ChapterWithContentResponseModel:
      type: object
      properties:
        chapter_id:
          type: string
          description: The ID of the chapter.
        name:
          type: string
          description: The name of the chapter.
        last_conversion_date_unix:
          type:
            - integer
            - 'null'
          description: The last conversion date of the chapter.
        conversion_progress:
          type:
            - number
            - 'null'
          format: double
          description: The conversion progress of the chapter.
        can_be_downloaded:
          type: boolean
          description: Whether the chapter can be downloaded.
        state:
          $ref: '#/components/schemas/ChapterWithContentResponseModelState'
          description: The state of the chapter.
        has_video:
          type:
            - boolean
            - 'null'
          description: Whether the chapter has a video.
        voice_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of voice ids used by the chapter
        statistics:
          oneOf:
            - $ref: '#/components/schemas/ChapterStatisticsResponseModel'
            - type: 'null'
          description: The statistics of the chapter.
        last_conversion_error:
          type:
            - string
            - 'null'
          description: The last conversion error of the chapter.
        content:
          $ref: '#/components/schemas/ChapterContentResponseModel'
      required:
        - chapter_id
        - name
        - can_be_downloaded
        - state
        - content

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.studio.projects.chapters.get("project_id", "chapter_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.studio.projects.chapters.get(
    project_id="project_id",
    chapter_id="chapter_id"
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

	url := "https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id"

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

url = URI("https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id")! as URL,
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