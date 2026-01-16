# Get Audio Native Project Settings

GET https://api.elevenlabs.io/v1/audio-native/{project_id}/settings

Get player settings for the specific project.

Reference: https://elevenlabs.io/docs/api-reference/audio-native/get-settings

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Audio Native Project Settings
  version: endpoint_audioNative.get_settings
paths:
  /v1/audio-native/{project_id}/settings:
    get:
      operationId: get-settings
      summary: Get Audio Native Project Settings
      description: Get player settings for the specific project.
      tags:
        - - subpackage_audioNative
      parameters:
        - name: project_id
          in: path
          description: The ID of the Studio project.
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
                $ref: >-
                  #/components/schemas/GetAudioNativeProjectSettingsResponseModel
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    AudioNativeProjectSettingsResponseModelStatus:
      type: string
      enum:
        - value: processing
        - value: ready
      default: ready
    AudioNativeProjectSettingsResponseModel:
      type: object
      properties:
        title:
          type: string
          description: The title of the project.
        image:
          type: string
          description: The image of the project.
        author:
          type: string
          description: The author of the project.
        small:
          type: boolean
          description: Whether the project is small.
        text_color:
          type: string
          description: The text color of the project.
        background_color:
          type: string
          description: The background color of the project.
        sessionization:
          type: integer
          description: >-
            The sessionization of the project. Specifies for how many minutes to
            persist the session across page reloads.
        audio_path:
          type:
            - string
            - 'null'
          description: The path of the audio file.
        audio_url:
          type:
            - string
            - 'null'
          description: The URL of the audio file.
        status:
          $ref: '#/components/schemas/AudioNativeProjectSettingsResponseModelStatus'
          description: Current state of the project
      required:
        - title
        - image
        - author
        - small
        - text_color
        - background_color
        - sessionization
    GetAudioNativeProjectSettingsResponseModel:
      type: object
      properties:
        enabled:
          type: boolean
          description: Whether the project is enabled.
        snapshot_id:
          type:
            - string
            - 'null'
          description: The ID of the latest snapshot of the project.
        settings:
          oneOf:
            - $ref: '#/components/schemas/AudioNativeProjectSettingsResponseModel'
            - type: 'null'
          description: The settings of the project.
      required:
        - enabled

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.audioNative.getSettings("project_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.audio_native.get_settings(
    project_id="project_id"
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

	url := "https://api.elevenlabs.io/v1/audio-native/project_id/settings"

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

url = URI("https://api.elevenlabs.io/v1/audio-native/project_id/settings")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/audio-native/project_id/settings")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/audio-native/project_id/settings', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/audio-native/project_id/settings");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/audio-native/project_id/settings")! as URL,
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