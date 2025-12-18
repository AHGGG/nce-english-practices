# Update audio native project

POST https://api.elevenlabs.io/v1/audio-native/{project_id}/content
Content-Type: multipart/form-data

Updates content for the specific AudioNative Project.

Reference: https://elevenlabs.io/docs/api-reference/audio-native/update

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Update audio native project
  version: endpoint_audioNative.update
paths:
  /v1/audio-native/{project_id}/content:
    post:
      operationId: update
      summary: Update audio native project
      description: Updates content for the specific AudioNative Project.
      tags:
        - - subpackage_audioNative
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
                $ref: '#/components/schemas/AudioNativeEditContentResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  description: >-
                    Either txt or HTML input file containing the article
                    content. HTML should be formatted as follows
                    '&lt;html&gt;&lt;body&gt;&lt;div&gt;&lt;p&gt;Your
                    content&lt;/p&gt;&lt;h5&gt;More of your
                    content&lt;/h5&gt;&lt;p&gt;Some more of your
                    content&lt;/p&gt;&lt;/div&gt;&lt;/body&gt;&lt;/html&gt;'
                auto_convert:
                  type: boolean
                  default: false
                  description: Whether to auto convert the project to audio or not.
                auto_publish:
                  type: boolean
                  default: false
                  description: >-
                    Whether to auto publish the new project snapshot after it's
                    converted.
components:
  schemas:
    AudioNativeEditContentResponseModel:
      type: object
      properties:
        project_id:
          type: string
          description: The ID of the project.
        converting:
          type: boolean
          description: Whether the project is currently being converted.
        publishing:
          type: boolean
          description: Whether the project is currently being published.
        html_snippet:
          type: string
          description: The HTML snippet to embed the Audio Native player.
      required:
        - project_id
        - converting
        - publishing
        - html_snippet

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.audioNative.update("project_id", {});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.audio_native.update(
    project_id="project_id"
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

	url := "https://api.elevenlabs.io/v1/audio-native/project_id/content"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"auto_convert\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"auto_publish\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

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

url = URI("https://api.elevenlabs.io/v1/audio-native/project_id/content")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"auto_convert\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"auto_publish\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/audio-native/project_id/content")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"auto_convert\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"auto_publish\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/audio-native/project_id/content', [
  'multipart' => [
    [
        'name' => 'file',
        'filename' => '<file1>',
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
var client = new RestClient("https://api.elevenlabs.io/v1/audio-native/project_id/content");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"auto_convert\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"auto_publish\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
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
    "name": "file",
    "fileName": "<file1>"
  ],
  [
    "name": "auto_convert",
    "value": 
  ],
  [
    "name": "auto_publish",
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/audio-native/project_id/content")! as URL,
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