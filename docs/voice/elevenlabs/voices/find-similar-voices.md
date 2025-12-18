# List similar voices

POST https://api.elevenlabs.io/v1/similar-voices
Content-Type: multipart/form-data

Returns a list of shared voices similar to the provided audio sample. If neither similarity_threshold nor top_k is provided, we will apply default values.

Reference: https://elevenlabs.io/docs/api-reference/voices/find-similar-voices

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List similar voices
  version: endpoint_voices.find_similar_voices
paths:
  /v1/similar-voices:
    post:
      operationId: find-similar-voices
      summary: List similar voices
      description: >-
        Returns a list of shared voices similar to the provided audio sample. If
        neither similarity_threshold nor top_k is provided, we will apply
        default values.
      tags:
        - - subpackage_voices
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
                $ref: '#/components/schemas/GetLibraryVoicesResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                audio_file:
                  type: string
                  format: binary
                similarity_threshold:
                  type:
                    - number
                    - 'null'
                  format: double
                  description: >-
                    Threshold for voice similarity between provided sample and
                    library voices. Values range from 0 to 2. The smaller the
                    value the more similar voices will be returned.
                top_k:
                  type:
                    - integer
                    - 'null'
                  description: >-
                    Number of most similar voices to return. If
                    similarity_threshold is provided, less than this number of
                    voices may be returned. Values range from 1 to 100.
components:
  schemas:
    LibraryVoiceResponseModelCategory:
      type: string
      enum:
        - value: generated
        - value: cloned
        - value: premade
        - value: professional
        - value: famous
        - value: high_quality
    VerifiedVoiceLanguageResponseModel:
      type: object
      properties:
        language:
          type: string
          description: The language of the voice.
        model_id:
          type: string
          description: The voice's model ID.
        accent:
          type:
            - string
            - 'null'
          description: The voice's accent, if applicable.
        locale:
          type:
            - string
            - 'null'
          description: The voice's locale, if applicable.
        preview_url:
          type:
            - string
            - 'null'
          description: The voice's preview URL, if applicable.
      required:
        - language
        - model_id
    LibraryVoiceResponseModel:
      type: object
      properties:
        public_owner_id:
          type: string
          description: The public owner id of the voice.
        voice_id:
          type: string
          description: The id of the voice.
        date_unix:
          type: integer
          description: The date the voice was added to the library in Unix time.
        name:
          type: string
          description: The name of the voice.
        accent:
          type: string
          description: The accent of the voice.
        gender:
          type: string
          description: The gender of the voice.
        age:
          type: string
          description: The age of the voice.
        descriptive:
          type: string
          description: The descriptive of the voice.
        use_case:
          type: string
          description: The use case of the voice.
        category:
          $ref: '#/components/schemas/LibraryVoiceResponseModelCategory'
          description: The category of the voice.
        language:
          type:
            - string
            - 'null'
          description: The language of the voice.
        locale:
          type:
            - string
            - 'null'
          description: The locale of the voice.
        description:
          type:
            - string
            - 'null'
          description: The description of the voice.
        preview_url:
          type:
            - string
            - 'null'
          description: The preview URL of the voice.
        usage_character_count_1y:
          type: integer
          description: The usage character count of the voice in the last year.
        usage_character_count_7d:
          type: integer
          description: The usage character count of the voice in the last 7 days.
        play_api_usage_character_count_1y:
          type: integer
          description: The play API usage character count of the voice in the last year.
        cloned_by_count:
          type: integer
          description: The number of times the voice has been cloned.
        rate:
          type:
            - number
            - 'null'
          format: double
          description: The rate multiplier of the voice.
        fiat_rate:
          type:
            - number
            - 'null'
          format: double
          description: The rate of the voice in USD per 1000 credits. null if default
        free_users_allowed:
          type: boolean
          description: Whether free users are allowed to use the voice.
        live_moderation_enabled:
          type: boolean
          description: Whether live moderation is enabled for the voice.
        featured:
          type: boolean
          description: Whether the voice is featured.
        verified_languages:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/VerifiedVoiceLanguageResponseModel'
          description: The verified languages of the voice.
        notice_period:
          type:
            - integer
            - 'null'
          description: The notice period of the voice.
        instagram_username:
          type:
            - string
            - 'null'
          description: The Instagram username of the voice.
        twitter_username:
          type:
            - string
            - 'null'
          description: The Twitter username of the voice.
        youtube_username:
          type:
            - string
            - 'null'
          description: The YouTube username of the voice.
        tiktok_username:
          type:
            - string
            - 'null'
          description: The TikTok username of the voice.
        image_url:
          type:
            - string
            - 'null'
          description: The image URL of the voice.
        is_added_by_user:
          type:
            - boolean
            - 'null'
          description: Whether the voice was added by the user.
      required:
        - public_owner_id
        - voice_id
        - date_unix
        - name
        - accent
        - gender
        - age
        - descriptive
        - use_case
        - category
        - usage_character_count_1y
        - usage_character_count_7d
        - play_api_usage_character_count_1y
        - cloned_by_count
        - free_users_allowed
        - live_moderation_enabled
        - featured
    GetLibraryVoicesResponseModel:
      type: object
      properties:
        voices:
          type: array
          items:
            $ref: '#/components/schemas/LibraryVoiceResponseModel'
          description: The list of shared voices
        has_more:
          type: boolean
          description: Whether there are more shared voices in subsequent pages.
        last_sort_id:
          type:
            - string
            - 'null'
      required:
        - voices
        - has_more

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.voices.findSimilarVoices({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.voices.find_similar_voices()

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

	url := "https://api.elevenlabs.io/v1/similar-voices"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"similarity_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"top_k\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

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

url = URI("https://api.elevenlabs.io/v1/similar-voices")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"similarity_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"top_k\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/similar-voices")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"similarity_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"top_k\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/similar-voices', [
  'multipart' => [
    [
        'name' => 'audio_file',
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
var client = new RestClient("https://api.elevenlabs.io/v1/similar-voices");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"audio_file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"similarity_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"top_k\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
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
    "name": "audio_file",
    "fileName": "<file1>"
  ],
  [
    "name": "similarity_threshold",
    "value": 
  ],
  [
    "name": "top_k",
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/similar-voices")! as URL,
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