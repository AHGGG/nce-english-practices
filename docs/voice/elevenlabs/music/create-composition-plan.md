# Create composition plan

POST https://api.elevenlabs.io/v1/music/plan
Content-Type: application/json

Create a composition plan for music generation. Usage of this endpoint does not cost any credits but is subject to rate limiting depending on your tier.

Reference: https://elevenlabs.io/docs/api-reference/music/create-composition-plan

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Generate Composition Plan
  version: endpoint_music/compositionPlan.create
paths:
  /v1/music/plan:
    post:
      operationId: create
      summary: Generate Composition Plan
      description: >-
        Create a composition plan for music generation. Usage of this endpoint
        does not cost any credits but is subject to rate limiting depending on
        your tier.
      tags:
        - - subpackage_music
          - subpackage_music/compositionPlan
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
                $ref: '#/components/schemas/MusicPrompt'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_Generate_composition_plan_v1_music_plan_post
components:
  schemas:
    TimeRange:
      type: object
      properties:
        start_ms:
          type: integer
        end_ms:
          type: integer
      required:
        - start_ms
        - end_ms
    SectionSource:
      type: object
      properties:
        song_id:
          type: string
          description: >-
            The ID of the song to source the section from. You can find the song
            ID in the response headers when you generate a song.
        range:
          $ref: '#/components/schemas/TimeRange'
          description: The range to extract from the source song.
        negative_ranges:
          type: array
          items:
            $ref: '#/components/schemas/TimeRange'
          description: The ranges to exclude from the 'range'.
      required:
        - song_id
        - range
    SongSection:
      type: object
      properties:
        section_name:
          type: string
          description: The name of the section. Must be between 1 and 100 characters.
        positive_local_styles:
          type: array
          items:
            type: string
          description: >-
            The styles and musical directions that should be present in this
            section. Use English language for best result.
        negative_local_styles:
          type: array
          items:
            type: string
          description: >-
            The styles and musical directions that should not be present in this
            section. Use English language for best result.
        duration_ms:
          type: integer
          description: >-
            The duration of the section in milliseconds. Must be between 3000ms
            and 120000ms.
        lines:
          type: array
          items:
            type: string
          description: The lyrics of the section. Max 200 characters per line.
        source_from:
          oneOf:
            - $ref: '#/components/schemas/SectionSource'
            - type: 'null'
          description: >-
            Optional source to extract the section from. Used for inpainting.
            Only available to enterprise clients with access to the inpainting
            API.
      required:
        - section_name
        - positive_local_styles
        - negative_local_styles
        - duration_ms
        - lines
    MusicPrompt:
      type: object
      properties:
        positive_global_styles:
          type: array
          items:
            type: string
          description: >-
            The styles and musical directions that should be present in the
            entire song. Use English language for best result.
        negative_global_styles:
          type: array
          items:
            type: string
          description: >-
            The styles and musical directions that should not be present in the
            entire song. Use English language for best result.
        sections:
          type: array
          items:
            $ref: '#/components/schemas/SongSection'
          description: The sections of the song.
      required:
        - positive_global_styles
        - negative_global_styles
        - sections
    BodyGenerateCompositionPlanV1MusicPlanPostModelId:
      type: string
      enum:
        - value: music_v1
      default: music_v1
    Body_Generate_composition_plan_v1_music_plan_post:
      type: object
      properties:
        prompt:
          type: string
          description: A simple text prompt to compose a plan from.
        music_length_ms:
          type:
            - integer
            - 'null'
          description: >-
            The length of the composition plan to generate in milliseconds. Must
            be between 3000ms and 300000ms. Optional - if not provided, the
            model will choose a length based on the prompt.
        source_composition_plan:
          oneOf:
            - $ref: '#/components/schemas/MusicPrompt'
            - type: 'null'
          description: >-
            An optional composition plan to use as a source for the new
            composition plan.
        model_id:
          $ref: >-
            #/components/schemas/BodyGenerateCompositionPlanV1MusicPlanPostModelId
          description: The model to use for the generation.
      required:
        - prompt

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.music.compositionPlan.create({
        prompt: "string",
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.music.composition_plan.create(
    prompt="string"
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

	url := "https://api.elevenlabs.io/v1/music/plan"

	payload := strings.NewReader("{\n  \"prompt\": \"string\"\n}")

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

url = URI("https://api.elevenlabs.io/v1/music/plan")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"prompt\": \"string\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/music/plan")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"prompt\": \"string\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/music/plan', [
  'body' => '{
  "prompt": "string"
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/music/plan");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"prompt\": \"string\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = ["prompt": "string"] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/music/plan")! as URL,
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