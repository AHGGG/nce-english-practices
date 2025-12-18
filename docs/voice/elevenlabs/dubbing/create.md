# Dub a video or audio file

POST https://api.elevenlabs.io/v1/dubbing
Content-Type: multipart/form-data

Dubs a provided audio or video file into given language.

Reference: https://elevenlabs.io/docs/api-reference/dubbing/create

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Dub a video or audio file
  version: endpoint_dubbing.create
paths:
  /v1/dubbing:
    post:
      operationId: create
      summary: Dub a video or audio file
      description: Dubs a provided audio or video file into given language.
      tags:
        - - subpackage_dubbing
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
                $ref: '#/components/schemas/DoDubbingResponseModel'
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
                    A list of file paths to audio recordings intended for voice
                    cloning
                csv_file:
                  type: string
                  format: binary
                  description: CSV file containing transcription/translation metadata
                foreground_audio_file:
                  type: string
                  format: binary
                  description: For use only with csv input
                background_audio_file:
                  type: string
                  format: binary
                  description: For use only with csv input
                name:
                  type:
                    - string
                    - 'null'
                  description: Name of the dubbing project.
                source_url:
                  type:
                    - string
                    - 'null'
                  description: URL of the source video/audio file.
                source_lang:
                  type: string
                  default: auto
                  description: >-
                    Source language. Expects a valid iso639-1 or iso639-3
                    language code.
                target_lang:
                  type:
                    - string
                    - 'null'
                  description: >-
                    The Target language to dub the content into. Expects a valid
                    iso639-1 or iso639-3 language code.
                target_accent:
                  type:
                    - string
                    - 'null'
                  description: >-
                    [Experimental] An accent to apply when selecting voices from
                    the library and to use to inform translation of the dialect
                    to prefer.
                num_speakers:
                  type: integer
                  default: 0
                  description: >-
                    Number of speakers to use for the dubbing. Set to 0 to
                    automatically detect the number of speakers
                watermark:
                  type: boolean
                  default: false
                  description: Whether to apply watermark to the output video.
                start_time:
                  type:
                    - integer
                    - 'null'
                  description: Start time of the source video/audio file.
                end_time:
                  type:
                    - integer
                    - 'null'
                  description: End time of the source video/audio file.
                highest_resolution:
                  type: boolean
                  default: false
                  description: Whether to use the highest resolution available.
                drop_background_audio:
                  type: boolean
                  default: false
                  description: >-
                    An advanced setting. Whether to drop background audio from
                    the final dub. This can improve dub quality where it's known
                    that audio shouldn't have a background track such as for
                    speeches or monologues.
                use_profanity_filter:
                  type:
                    - boolean
                    - 'null'
                  description: >-
                    [BETA] Whether transcripts should have profanities censored
                    with the words '[censored]'
                dubbing_studio:
                  type: boolean
                  default: false
                  description: >-
                    Whether to prepare dub for edits in dubbing studio or edits
                    as a dubbing resource.
                disable_voice_cloning:
                  type: boolean
                  default: false
                  description: >-
                    Instead of using a voice clone in dubbing, use a similar
                    voice from the ElevenLabs Voice Library. Voices used from
                    the library will contribute towards a workspace's custom
                    voices limit, and if there aren't enough available slots the
                    dub will fail. Using this feature requires the caller to
                    have the 'add_voice_from_voice_library' permission on their
                    workspace to access new voices.
                mode:
                  $ref: >-
                    #/components/schemas/V1DubbingPostRequestBodyContentMultipartFormDataSchemaMode
                  description: >-
                    The mode in which to run this Dubbing job. Defaults to
                    automatic, use manual if specifically providing a CSV
                    transcript to use.
                csv_fps:
                  type:
                    - number
                    - 'null'
                  format: double
                  description: >-
                    Frames per second to use when parsing a CSV file for
                    dubbing. If not provided, FPS will be inferred from
                    timecodes.
              required:
                - target_lang
components:
  schemas:
    V1DubbingPostRequestBodyContentMultipartFormDataSchemaMode:
      type: string
      enum:
        - value: automatic
        - value: manual
      default: automatic
    DoDubbingResponseModel:
      type: object
      properties:
        dubbing_id:
          type: string
          description: The ID of the dubbing project.
        expected_duration_sec:
          type: number
          format: double
          description: The expected duration of the dubbing project in seconds.
      required:
        - dubbing_id
        - expected_duration_sec

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.dubbing.create({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.dubbing.create()

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

	url := "https://api.elevenlabs.io/v1/dubbing"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"csv_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"foreground_audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"background_audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"source_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"source_lang\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"target_lang\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"target_accent\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"watermark\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"start_time\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"end_time\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"highest_resolution\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"drop_background_audio\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_profanity_filter\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"dubbing_studio\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"disable_voice_cloning\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"csv_fps\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

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

url = URI("https://api.elevenlabs.io/v1/dubbing")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"csv_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"foreground_audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"background_audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"source_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"source_lang\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"target_lang\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"target_accent\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"watermark\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"start_time\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"end_time\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"highest_resolution\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"drop_background_audio\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_profanity_filter\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"dubbing_studio\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"disable_voice_cloning\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"csv_fps\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/dubbing")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"csv_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"foreground_audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"background_audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"source_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"source_lang\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"target_lang\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"target_accent\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"watermark\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"start_time\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"end_time\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"highest_resolution\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"drop_background_audio\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_profanity_filter\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"dubbing_studio\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"disable_voice_cloning\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"csv_fps\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/dubbing', [
  'multipart' => [
    [
        'name' => 'file',
        'filename' => '<file1>',
        'contents' => null
    ],
    [
        'name' => 'csv_file',
        'filename' => '<file1>',
        'contents' => null
    ],
    [
        'name' => 'foreground_audio_file',
        'filename' => '<file1>',
        'contents' => null
    ],
    [
        'name' => 'background_audio_file',
        'filename' => '<file1>',
        'contents' => null
    ],
    [
        'name' => 'target_lang',
        'contents' => 'string'
    ]
  ]
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/dubbing");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"csv_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"foreground_audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"background_audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"source_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"source_lang\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"target_lang\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"target_accent\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"watermark\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"start_time\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"end_time\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"highest_resolution\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"drop_background_audio\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_profanity_filter\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"dubbing_studio\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"disable_voice_cloning\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"csv_fps\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
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
    "name": "csv_file",
    "fileName": "<file1>"
  ],
  [
    "name": "foreground_audio_file",
    "fileName": "<file1>"
  ],
  [
    "name": "background_audio_file",
    "fileName": "<file1>"
  ],
  [
    "name": "name",
    "value": 
  ],
  [
    "name": "source_url",
    "value": 
  ],
  [
    "name": "source_lang",
    "value": 
  ],
  [
    "name": "target_lang",
    "value": "string"
  ],
  [
    "name": "target_accent",
    "value": 
  ],
  [
    "name": "num_speakers",
    "value": 
  ],
  [
    "name": "watermark",
    "value": 
  ],
  [
    "name": "start_time",
    "value": 
  ],
  [
    "name": "end_time",
    "value": 
  ],
  [
    "name": "highest_resolution",
    "value": 
  ],
  [
    "name": "drop_background_audio",
    "value": 
  ],
  [
    "name": "use_profanity_filter",
    "value": 
  ],
  [
    "name": "dubbing_studio",
    "value": 
  ],
  [
    "name": "disable_voice_cloning",
    "value": 
  ],
  [
    "name": "mode",
    "value": 
  ],
  [
    "name": "csv_fps",
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/dubbing")! as URL,
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