# Compose music

POST https://api.elevenlabs.io/v1/music
Content-Type: application/json

Compose a song from a prompt or a composition plan.

Reference: https://elevenlabs.io/docs/api-reference/music/compose

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Compose Music
  version: endpoint_music.compose
paths:
  /v1/music:
    post:
      operationId: compose
      summary: Compose Music
      description: Compose a song from a prompt or a composition plan.
      tags:
        - - subpackage_music
      parameters:
        - name: output_format
          in: query
          description: >-
            Output format of the generated audio. Formatted as
            codec_sample_rate_bitrate. So an mp3 with 22.05kHz sample rate at
            32kbs is represented as mp3_22050_32. MP3 with 192kbps bitrate
            requires you to be subscribed to Creator tier or above. PCM with
            44.1kHz sample rate requires you to be subscribed to Pro tier or
            above. Note that the μ-law format (sometimes written mu-law, often
            approximated as u-law) is commonly used for Twilio audio inputs.
          required: false
          schema:
            $ref: '#/components/schemas/V1MusicPostParametersOutputFormat'
        - name: xi-api-key
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: The generated audio file in the format specified
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Body_Compose_music_v1_music_post'
components:
  schemas:
    V1MusicPostParametersOutputFormat:
      type: string
      enum:
        - value: mp3_22050_32
        - value: mp3_24000_48
        - value: mp3_44100_32
        - value: mp3_44100_64
        - value: mp3_44100_96
        - value: mp3_44100_128
        - value: mp3_44100_192
        - value: pcm_8000
        - value: pcm_16000
        - value: pcm_22050
        - value: pcm_24000
        - value: pcm_32000
        - value: pcm_44100
        - value: pcm_48000
        - value: ulaw_8000
        - value: alaw_8000
        - value: opus_48000_32
        - value: opus_48000_64
        - value: opus_48000_96
        - value: opus_48000_128
        - value: opus_48000_192
      default: mp3_44100_128
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
    BodyComposeMusicV1MusicPostModelId:
      type: string
      enum:
        - value: music_v1
      default: music_v1
    Body_Compose_music_v1_music_post:
      type: object
      properties:
        prompt:
          type:
            - string
            - 'null'
          description: >-
            A simple text prompt to generate a song from. Cannot be used in
            conjunction with `composition_plan`.
        composition_plan:
          oneOf:
            - $ref: '#/components/schemas/MusicPrompt'
            - type: 'null'
          description: >-
            A detailed composition plan to guide music generation. Cannot be
            used in conjunction with `prompt`.
        music_length_ms:
          type:
            - integer
            - 'null'
          description: >-
            The length of the song to generate in milliseconds. Used only in
            conjunction with `prompt`. Must be between 3000ms and 300000ms.
            Optional - if not provided, the model will choose a length based on
            the prompt.
        model_id:
          $ref: '#/components/schemas/BodyComposeMusicV1MusicPostModelId'
          description: The model to use for the generation.
        force_instrumental:
          type: boolean
          default: false
          description: >-
            If true, guarantees that the generated song will be instrumental. If
            false, the song may or may not be instrumental depending on the
            `prompt`. Can only be used with `prompt`.
        respect_sections_durations:
          type: boolean
          default: true
          description: >-
            Controls how strictly section durations in the `composition_plan`
            are enforced. Only used with `composition_plan`. When set to true,
            the model will precisely respect each section's `duration_ms` from
            the plan. When set to false, the model may adjust individual section
            durations which will generally lead to better generation quality and
            improved latency, while always preserving the total song duration
            from the plan.
        store_for_inpainting:
          type: boolean
          default: false
          description: >-
            Whether to store the generated song for inpainting. Only available
            to enterprise clients with access to the inpainting API.
        sign_with_c2pa:
          type: boolean
          default: false
          description: >-
            Whether to sign the generated song with C2PA. Applicable only for
            mp3 files.

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.music.compose({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.music.compose()

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

	url := "https://api.elevenlabs.io/v1/music"

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

url = URI("https://api.elevenlabs.io/v1/music")

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
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/music")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/music', [
  'body' => '{}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/music");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/music")! as URL,
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