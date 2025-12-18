# Get transcript

GET https://api.elevenlabs.io/v1/speech-to-text/transcripts/{transcription_id}

Retrieve a previously generated transcript by its ID.

Reference: https://elevenlabs.io/docs/api-reference/speech-to-text/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Transcript By Id
  version: endpoint_speechToText/transcripts.get
paths:
  /v1/speech-to-text/transcripts/{transcription_id}:
    get:
      operationId: get
      summary: Get Transcript By Id
      description: Retrieve a previously generated transcript by its ID.
      tags:
        - - subpackage_speechToText
          - subpackage_speechToText/transcripts
      parameters:
        - name: transcription_id
          in: path
          description: The unique ID of the transcript to retrieve
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
          description: The transcript data
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/speech_to_text_transcripts_get_Response_200
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    SpeechToTextWordResponseModelType:
      type: string
      enum:
        - value: word
        - value: spacing
        - value: audio_event
    SpeechToTextCharacterResponseModel:
      type: object
      properties:
        text:
          type: string
          description: The character that was transcribed.
        start:
          type:
            - number
            - 'null'
          format: double
          description: The start time of the character in seconds.
        end:
          type:
            - number
            - 'null'
          format: double
          description: The end time of the character in seconds.
      required:
        - text
    SpeechToTextWordResponseModel:
      type: object
      properties:
        text:
          type: string
          description: The word or sound that was transcribed.
        start:
          type:
            - number
            - 'null'
          format: double
          description: The start time of the word or sound in seconds.
        end:
          type:
            - number
            - 'null'
          format: double
          description: The end time of the word or sound in seconds.
        type:
          $ref: '#/components/schemas/SpeechToTextWordResponseModelType'
          description: >-
            The type of the word or sound. 'audio_event' is used for non-word
            sounds like laughter or footsteps.
        speaker_id:
          type:
            - string
            - 'null'
          description: Unique identifier for the speaker of this word.
        logprob:
          type: number
          format: double
          description: >-
            The log of the probability with which this word was predicted.
            Logprobs are in range [-infinity, 0], higher logprobs indicate a
            higher confidence the model has in its predictions.
        characters:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/SpeechToTextCharacterResponseModel'
          description: The characters that make up the word and their timing information.
      required:
        - text
        - type
        - logprob
    AdditionalFormatResponseModel:
      type: object
      properties:
        requested_format:
          type: string
          description: The requested format.
        file_extension:
          type: string
          description: The file extension of the additional format.
        content_type:
          type: string
          description: The content type of the additional format.
        is_base64_encoded:
          type: boolean
          description: Whether the content is base64 encoded.
        content:
          type: string
          description: The content of the additional format.
      required:
        - requested_format
        - file_extension
        - content_type
        - is_base64_encoded
        - content
    SpeechToTextChunkResponseModel:
      type: object
      properties:
        language_code:
          type: string
          description: The detected language code (e.g. 'eng' for English).
        language_probability:
          type: number
          format: double
          description: The confidence score of the language detection (0 to 1).
        text:
          type: string
          description: The raw text of the transcription.
        words:
          type: array
          items:
            $ref: '#/components/schemas/SpeechToTextWordResponseModel'
          description: List of words with their timing information.
        channel_index:
          type:
            - integer
            - 'null'
          description: >-
            The channel index this transcript belongs to (for multichannel
            audio).
        additional_formats:
          type:
            - array
            - 'null'
          items:
            oneOf:
              - $ref: '#/components/schemas/AdditionalFormatResponseModel'
              - type: 'null'
          description: Requested additional formats of the transcript.
        transcription_id:
          type:
            - string
            - 'null'
          description: The transcription ID of the response.
      required:
        - language_code
        - language_probability
        - text
        - words
    MultichannelSpeechToTextResponseModel:
      type: object
      properties:
        transcripts:
          type: array
          items:
            $ref: '#/components/schemas/SpeechToTextChunkResponseModel'
          description: >-
            List of transcripts, one for each audio channel. Each transcript
            contains the text and word-level details for its respective channel.
        transcription_id:
          type:
            - string
            - 'null'
          description: The transcription ID of the response.
      required:
        - transcripts
    speech_to_text_transcripts_get_Response_200:
      oneOf:
        - $ref: '#/components/schemas/SpeechToTextChunkResponseModel'
        - $ref: '#/components/schemas/MultichannelSpeechToTextResponseModel'
        - $ref: '#/components/schemas/SpeechToTextChunkResponseModel'
        - $ref: '#/components/schemas/MultichannelSpeechToTextResponseModel'

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.speechToText.transcripts.get("transcription_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.speech_to_text.transcripts.get(
    transcription_id="transcription_id"
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

	url := "https://api.elevenlabs.io/v1/speech-to-text/transcripts/transcription_id"

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

url = URI("https://api.elevenlabs.io/v1/speech-to-text/transcripts/transcription_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/speech-to-text/transcripts/transcription_id")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/speech-to-text/transcripts/transcription_id', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/speech-to-text/transcripts/transcription_id");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/speech-to-text/transcripts/transcription_id")! as URL,
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