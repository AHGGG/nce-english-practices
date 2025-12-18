# Update Chapter

POST https://api.elevenlabs.io/v1/studio/projects/{project_id}/chapters/{chapter_id}
Content-Type: application/json

Updates a chapter.

Reference: https://elevenlabs.io/docs/api-reference/studio/update-chapter

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Update Chapter
  version: endpoint_studio/projects/chapters.update
paths:
  /v1/studio/projects/{project_id}/chapters/{chapter_id}:
    post:
      operationId: update
      summary: Update Chapter
      description: Updates a chapter.
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
                $ref: '#/components/schemas/EditChapterResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_Update_chapter_v1_studio_projects__project_id__chapters__chapter_id__post
components:
  schemas:
    ChapterContentBlockInputModelSubType:
      type: string
      enum:
        - value: p
        - value: h1
        - value: h2
        - value: h3
    ChapterContentParagraphTtsNodeInputModel:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: tts_node
        text:
          type: string
        voice_id:
          type: string
      required:
        - type
        - text
        - voice_id
    ChapterContentBlockInputModel:
      type: object
      properties:
        sub_type:
          oneOf:
            - $ref: '#/components/schemas/ChapterContentBlockInputModelSubType'
            - type: 'null'
        nodes:
          type: array
          items:
            $ref: '#/components/schemas/ChapterContentParagraphTtsNodeInputModel'
        block_id:
          type:
            - string
            - 'null'
      required:
        - nodes
    ChapterContentInputModel:
      type: object
      properties:
        blocks:
          type: array
          items:
            $ref: '#/components/schemas/ChapterContentBlockInputModel'
      required:
        - blocks
    Body_Update_chapter_v1_studio_projects__project_id__chapters__chapter_id__post:
      type: object
      properties:
        name:
          type:
            - string
            - 'null'
          description: The name of the chapter, used for identification only.
        content:
          oneOf:
            - $ref: '#/components/schemas/ChapterContentInputModel'
            - type: 'null'
          description: The chapter content to use.
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
    EditChapterResponseModel:
      type: object
      properties:
        chapter:
          $ref: '#/components/schemas/ChapterWithContentResponseModel'
      required:
        - chapter

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.studio.projects.chapters.update("project_id", "chapter_id", {});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.studio.projects.chapters.update(
    project_id="project_id",
    chapter_id="chapter_id"
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

	url := "https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id"

	payload := strings.NewReader("{}")

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

url = URI("https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id', [
  'body' => '{}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id")! as URL,
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