# Convert Chapter

POST https://api.elevenlabs.io/v1/studio/projects/{project_id}/chapters/{chapter_id}/convert

Starts conversion of a specific chapter.

Reference: https://elevenlabs.io/docs/api-reference/studio/convert-chapter

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Convert Chapter
  version: endpoint_studio/projects/chapters.convert
paths:
  /v1/studio/projects/{project_id}/chapters/{chapter_id}/convert:
    post:
      operationId: convert
      summary: Convert Chapter
      description: Starts conversion of a specific chapter.
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
                $ref: '#/components/schemas/ConvertChapterResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ConvertChapterResponseModel:
      type: object
      properties:
        status:
          type: string
          description: >-
            The status of the studio chapter conversion request. If the request
            was successful, the status will be 'ok'. Otherwise an error message
            with status 500 will be returned.
      required:
        - status

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.studio.projects.chapters.convert("project_id", "chapter_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.studio.projects.chapters.convert(
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

	url := "https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id/convert"

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

url = URI("https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id/convert")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id/convert")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id/convert', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id/convert");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/studio/projects/project_id/chapters/chapter_id/convert")! as URL,
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