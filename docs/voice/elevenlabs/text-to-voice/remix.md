# Remix a voice

POST https://api.elevenlabs.io/v1/text-to-voice/{voice_id}/remix
Content-Type: application/json

Remix an existing voice via a prompt. This method returns a list of voice previews. Each preview has a generated_voice_id and a sample of the voice as base64 encoded mp3 audio. To create a voice use the generated_voice_id of the preferred preview with the /v1/text-to-voice endpoint.

Reference: https://elevenlabs.io/docs/api-reference/text-to-voice/remix

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Remix A Voice.
  version: endpoint_textToVoice.remix
paths:
  /v1/text-to-voice/{voice_id}/remix:
    post:
      operationId: remix
      summary: Remix A Voice.
      description: >-
        Remix an existing voice via a prompt. This method returns a list of
        voice previews. Each preview has a generated_voice_id and a sample of
        the voice as base64 encoded mp3 audio. To create a voice use the
        generated_voice_id of the preferred preview with the /v1/text-to-voice
        endpoint.
      tags:
        - - subpackage_textToVoice
      parameters:
        - name: voice_id
          in: path
          description: >-
            Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices
            to list all the available voices.
          required: true
          schema:
            type: string
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
            $ref: >-
              #/components/schemas/V1TextToVoiceVoiceIdRemixPostParametersOutputFormat
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
                $ref: '#/components/schemas/VoicePreviewsResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VoiceRemixRequestModel'
components:
  schemas:
    V1TextToVoiceVoiceIdRemixPostParametersOutputFormat:
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
      default: mp3_44100_192
    VoiceRemixRequestModel:
      type: object
      properties:
        voice_description:
          type: string
          description: Description of the changes to make to the voice.
        text:
          type:
            - string
            - 'null'
          description: Text to generate, text length has to be between 100 and 1000.
        auto_generate_text:
          type: boolean
          default: false
          description: >-
            Whether to automatically generate a text suitable for the voice
            description.
        loudness:
          type: number
          format: double
          default: 0.5
          description: >-
            Controls the volume level of the generated voice. -1 is quietest, 1
            is loudest, 0 corresponds to roughly -24 LUFS.
        seed:
          type:
            - integer
            - 'null'
          description: >-
            Random number that controls the voice generation. Same seed with
            same inputs produces same voice.
        guidance_scale:
          type: number
          format: double
          default: 2
          description: >-
            Controls how closely the AI follows the prompt. Lower numbers give
            the AI more freedom to be creative, while higher numbers force it to
            stick more to the prompt. High numbers can cause voice to sound
            artificial or robotic. We recommend to use longer, more detailed
            prompts at lower Guidance Scale.
        stream_previews:
          type: boolean
          default: false
          description: >-
            Determines whether the Text to Voice previews should be included in
            the response. If true, only the generated IDs will be returned which
            can then be streamed via the
            /v1/text-to-voice/:generated_voice_id/stream endpoint.
        remixing_session_id:
          type:
            - string
            - 'null'
          description: The remixing session id.
        remixing_session_iteration_id:
          type:
            - string
            - 'null'
          description: >-
            The id of the remixing session iteration where these generations
            should be attached to. If not provided, a new iteration will be
            created.
        prompt_strength:
          type:
            - number
            - 'null'
          format: double
          description: >-
            Controls the balance of prompt versus reference audio when
            generating voice samples. 0 means almost no prompt influence, 1
            means almost no reference audio influence. Only supported when using
            the eleven_ttv_v3 model and providing reference audio.
      required:
        - voice_description
    VoicePreviewResponseModel:
      type: object
      properties:
        audio_base_64:
          type: string
          description: The base64 encoded audio of the preview.
        generated_voice_id:
          type: string
          description: >-
            The ID of the generated voice. Use it to create a voice from the
            preview.
        media_type:
          type: string
          description: The media type of the preview.
        duration_secs:
          type: number
          format: double
          description: The duration of the preview in seconds.
        language:
          type:
            - string
            - 'null'
          description: The language of the preview.
      required:
        - audio_base_64
        - generated_voice_id
        - media_type
        - duration_secs
        - language
    VoicePreviewsResponseModel:
      type: object
      properties:
        previews:
          type: array
          items:
            $ref: '#/components/schemas/VoicePreviewResponseModel'
          description: The previews of the generated voices.
        text:
          type: string
          description: The text used to preview the voices.
      required:
        - previews
        - text

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.textToVoice.remix("voice_id", {
        voiceDescription: "Make the voice have a higher pitch.",
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.text_to_voice.remix(
    voice_id="voice_id",
    voice_description="Make the voice have a higher pitch."
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

	url := "https://api.elevenlabs.io/v1/text-to-voice/voice_id/remix"

	payload := strings.NewReader("{\n  \"voice_description\": \"Make the voice have a higher pitch.\"\n}")

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

url = URI("https://api.elevenlabs.io/v1/text-to-voice/voice_id/remix")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"voice_description\": \"Make the voice have a higher pitch.\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/text-to-voice/voice_id/remix")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"voice_description\": \"Make the voice have a higher pitch.\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/text-to-voice/voice_id/remix', [
  'body' => '{
  "voice_description": "Make the voice have a higher pitch."
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/text-to-voice/voice_id/remix");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"voice_description\": \"Make the voice have a higher pitch.\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = ["voice_description": "Make the voice have a higher pitch."] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/text-to-voice/voice_id/remix")! as URL,
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