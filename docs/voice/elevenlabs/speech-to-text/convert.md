# Create transcript

POST https://api.elevenlabs.io/v1/speech-to-text
Content-Type: multipart/form-data

Transcribe an audio or video file. If webhook is set to true, the request will be processed asynchronously and results sent to configured webhooks. When use_multi_channel is true and the provided audio has multiple channels, a 'transcripts' object with separate transcripts for each channel is returned. Otherwise, returns a single transcript. The optional webhook_metadata parameter allows you to attach custom data that will be included in webhook responses for request correlation and tracking.

Reference: https://elevenlabs.io/docs/api-reference/speech-to-text/convert

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create transcript
  version: endpoint_speechToText.convert
paths:
  /v1/speech-to-text:
    post:
      operationId: convert
      summary: Create transcript
      description: >-
        Transcribe an audio or video file. If webhook is set to true, the
        request will be processed asynchronously and results sent to configured
        webhooks. When use_multi_channel is true and the provided audio has
        multiple channels, a 'transcripts' object with separate transcripts for
        each channel is returned. Otherwise, returns a single transcript. The
        optional webhook_metadata parameter allows you to attach custom data
        that will be included in webhook responses for request correlation and
        tracking.
      tags:
        - - subpackage_speechToText
      parameters:
        - name: enable_logging
          in: query
          description: >-
            When enable_logging is set to false zero retention mode will be used
            for the request. This will mean log and transcript storage features
            are unavailable for this request. Zero retention mode may only be
            used by enterprise customers.
          required: false
          schema:
            type: boolean
            default: true
        - name: xi-api-key
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Synchronous transcription result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/speech_to_text_convert_Response_200'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                model_id:
                  type: string
                  description: >-
                    The ID of the model to use for transcription, currently only
                    'scribe_v1' and 'scribe_v1_experimental' are available.
                file:
                  type: string
                  format: binary
                  description: >-
                    The file to transcribe. All major audio and video formats
                    are supported. Exactly one of the file or cloud_storage_url
                    parameters must be provided. The file size must be less than
                    3.0GB.
                language_code:
                  type:
                    - string
                    - 'null'
                  description: >-
                    An ISO-639-1 or ISO-639-3 language_code corresponding to the
                    language of the audio file. Can sometimes improve
                    transcription performance if known beforehand. Defaults to
                    null, in this case the language is predicted automatically.
                tag_audio_events:
                  type: boolean
                  default: true
                  description: >-
                    Whether to tag audio events like (laughter), (footsteps),
                    etc. in the transcription.
                num_speakers:
                  type:
                    - integer
                    - 'null'
                  description: >-
                    The maximum amount of speakers talking in the uploaded file.
                    Can help with predicting who speaks when. The maximum amount
                    of speakers that can be predicted is 32. Defaults to null,
                    in this case the amount of speakers is set to the maximum
                    value the model supports.
                timestamps_granularity:
                  $ref: >-
                    #/components/schemas/V1SpeechToTextPostRequestBodyContentMultipartFormDataSchemaTimestampsGranularity
                  description: >-
                    The granularity of the timestamps in the transcription.
                    'word' provides word-level timestamps and 'character'
                    provides character-level timestamps per word.
                diarize:
                  type: boolean
                  default: false
                  description: >-
                    Whether to annotate which speaker is currently talking in
                    the uploaded file.
                diarization_threshold:
                  type:
                    - number
                    - 'null'
                  format: double
                  description: >-
                    Diarization threshold to apply during speaker diarization. A
                    higher value means there will be a lower chance of one
                    speaker being diarized as two different speakers but also a
                    higher chance of two different speakers being diarized as
                    one speaker (less total speakers predicted). A low value
                    means there will be a higher chance of one speaker being
                    diarized as two different speakers but also a lower chance
                    of two different speakers being diarized as one speaker
                    (more total speakers predicted). Can only be set when
                    diarize=True and num_speakers=None. Defaults to None, in
                    which case we will choose a threshold based on the model_id
                    (0.22 usually).
                additional_formats:
                  $ref: '#/components/schemas/AdditionalFormats'
                  description: A list of additional formats to export the transcript to.
                file_format:
                  $ref: >-
                    #/components/schemas/V1SpeechToTextPostRequestBodyContentMultipartFormDataSchemaFileFormat
                  description: >-
                    The format of input audio. Options are 'pcm_s16le_16' or
                    'other' For `pcm_s16le_16`, the input audio must be 16-bit
                    PCM at a 16kHz sample rate, single channel (mono), and
                    little-endian byte order. Latency will be lower than with
                    passing an encoded waveform.
                cloud_storage_url:
                  type:
                    - string
                    - 'null'
                  description: >-
                    The HTTPS URL of the file to transcribe. Exactly one of the
                    file or cloud_storage_url parameters must be provided. The
                    file must be accessible via HTTPS and the file size must be
                    less than 2GB. Any valid HTTPS URL is accepted, including
                    URLs from cloud storage providers (AWS S3, Google Cloud
                    Storage, Cloudflare R2, etc.), CDNs, or any other HTTPS
                    source. URLs can be pre-signed or include authentication
                    tokens in query parameters.
                webhook:
                  type: boolean
                  default: false
                  description: >-
                    Whether to send the transcription result to configured
                    speech-to-text webhooks.  If set the request will return
                    early without the transcription, which will be delivered
                    later via webhook.
                webhook_id:
                  type:
                    - string
                    - 'null'
                  description: >-
                    Optional specific webhook ID to send the transcription
                    result to. Only valid when webhook is set to true. If not
                    provided, transcription will be sent to all configured
                    speech-to-text webhooks.
                temperature:
                  type:
                    - number
                    - 'null'
                  format: double
                  description: >-
                    Controls the randomness of the transcription output. Accepts
                    values between 0.0 and 2.0, where higher values result in
                    more diverse and less deterministic results. If omitted, we
                    will use a temperature based on the model you selected which
                    is usually 0.
                seed:
                  type:
                    - integer
                    - 'null'
                  description: >-
                    If specified, our system will make a best effort to sample
                    deterministically, such that repeated requests with the same
                    seed and parameters should return the same result.
                    Determinism is not guaranteed. Must be an integer between 0
                    and 2147483647.
                use_multi_channel:
                  type: boolean
                  default: false
                  description: >-
                    Whether the audio file contains multiple channels where each
                    channel contains a single speaker. When enabled, each
                    channel will be transcribed independently and the results
                    will be combined. Each word in the response will include a
                    'channel_index' field indicating which channel it was spoken
                    on. A maximum of 5 channels is supported.
                webhook_metadata:
                  oneOf:
                    - $ref: >-
                        #/components/schemas/V1SpeechToTextPostRequestBodyContentMultipartFormDataSchemaWebhookMetadata
                    - type: 'null'
                  description: >-
                    Optional metadata to be included in the webhook response.
                    This should be a JSON string representing an object with a
                    maximum depth of 2 levels and maximum size of 16KB. Useful
                    for tracking internal IDs, job references, or other
                    contextual information.
              required:
                - model_id
components:
  schemas:
    V1SpeechToTextPostRequestBodyContentMultipartFormDataSchemaTimestampsGranularity:
      type: string
      enum:
        - value: none
        - value: word
        - value: character
      default: word
    SegmentedJsonExportOptions:
      type: object
      properties:
        include_speakers:
          type: boolean
          default: true
        include_timestamps:
          type: boolean
          default: true
        format:
          type: string
          enum:
            - type: stringLiteral
              value: segmented_json
        segment_on_silence_longer_than_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_duration_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_chars:
          type:
            - integer
            - 'null'
      required:
        - format
    DocxExportOptions:
      type: object
      properties:
        include_speakers:
          type: boolean
          default: true
        include_timestamps:
          type: boolean
          default: true
        format:
          type: string
          enum:
            - type: stringLiteral
              value: docx
        segment_on_silence_longer_than_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_duration_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_chars:
          type:
            - integer
            - 'null'
      required:
        - format
    PdfExportOptions:
      type: object
      properties:
        include_speakers:
          type: boolean
          default: true
        include_timestamps:
          type: boolean
          default: true
        format:
          type: string
          enum:
            - type: stringLiteral
              value: pdf
        segment_on_silence_longer_than_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_duration_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_chars:
          type:
            - integer
            - 'null'
      required:
        - format
    TxtExportOptions:
      type: object
      properties:
        max_characters_per_line:
          type:
            - integer
            - 'null'
          default: 100
        include_speakers:
          type: boolean
          default: true
        include_timestamps:
          type: boolean
          default: true
        format:
          type: string
          enum:
            - type: stringLiteral
              value: txt
        segment_on_silence_longer_than_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_duration_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_chars:
          type:
            - integer
            - 'null'
      required:
        - format
    HtmlExportOptions:
      type: object
      properties:
        include_speakers:
          type: boolean
          default: true
        include_timestamps:
          type: boolean
          default: true
        format:
          type: string
          enum:
            - type: stringLiteral
              value: html
        segment_on_silence_longer_than_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_duration_s:
          type:
            - number
            - 'null'
          format: double
        max_segment_chars:
          type:
            - integer
            - 'null'
      required:
        - format
    SrtExportOptions:
      type: object
      properties:
        max_characters_per_line:
          type:
            - integer
            - 'null'
          default: 42
        include_speakers:
          type: boolean
          default: false
        include_timestamps:
          type: boolean
          default: true
        format:
          type: string
          enum:
            - type: stringLiteral
              value: srt
        segment_on_silence_longer_than_s:
          type:
            - number
            - 'null'
          format: double
          default: 0.8
        max_segment_duration_s:
          type:
            - number
            - 'null'
          format: double
          default: 4
        max_segment_chars:
          type:
            - integer
            - 'null'
          default: 84
      required:
        - format
    ExportOptions:
      oneOf:
        - $ref: '#/components/schemas/SegmentedJsonExportOptions'
        - $ref: '#/components/schemas/DocxExportOptions'
        - $ref: '#/components/schemas/PdfExportOptions'
        - $ref: '#/components/schemas/TxtExportOptions'
        - $ref: '#/components/schemas/HtmlExportOptions'
        - $ref: '#/components/schemas/SrtExportOptions'
    AdditionalFormats:
      type: array
      items:
        $ref: '#/components/schemas/ExportOptions'
    V1SpeechToTextPostRequestBodyContentMultipartFormDataSchemaFileFormat:
      type: string
      enum:
        - value: pcm_s16le_16
        - value: other
      default: other
    V1SpeechToTextPostRequestBodyContentMultipartFormDataSchemaWebhookMetadata:
      oneOf:
        - type: string
        - type: object
          additionalProperties:
            description: Any type
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
    SpeechToTextWebhookResponseModel:
      type: object
      properties:
        message:
          type: string
          description: The message of the webhook response.
        request_id:
          type: string
          description: The request ID of the webhook response.
        transcription_id:
          type:
            - string
            - 'null'
          description: The transcription ID of the webhook response.
      required:
        - message
        - request_id
    speech_to_text_convert_Response_200:
      oneOf:
        - $ref: '#/components/schemas/SpeechToTextChunkResponseModel'
        - $ref: '#/components/schemas/MultichannelSpeechToTextResponseModel'
        - $ref: '#/components/schemas/SpeechToTextWebhookResponseModel'

```

## SDK Code Examples

```typescript Single channel response
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.speechToText.convert({});
}
main();

```

```python Single channel response
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.speech_to_text.convert()

```

```go Single channel response
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/speech-to-text"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

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

```ruby Single channel response
require 'uri'
require 'net/http'

url = URI("https://api.elevenlabs.io/v1/speech-to-text")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java Single channel response
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/speech-to-text")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php Single channel response
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/speech-to-text', [
  'multipart' => [
    [
        'name' => 'model_id',
        'contents' => 'string'
    ],
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

```csharp Single channel response
var client = new RestClient("https://api.elevenlabs.io/v1/speech-to-text");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift Single channel response
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "multipart/form-data; boundary=---011000010111000001101001"
]
let parameters = [
  [
    "name": "model_id",
    "value": "string"
  ],
  [
    "name": "file",
    "fileName": "<file1>"
  ],
  [
    "name": "language_code",
    "value": 
  ],
  [
    "name": "tag_audio_events",
    "value": 
  ],
  [
    "name": "num_speakers",
    "value": 
  ],
  [
    "name": "timestamps_granularity",
    "value": 
  ],
  [
    "name": "diarize",
    "value": 
  ],
  [
    "name": "diarization_threshold",
    "value": 
  ],
  [
    "name": "additional_formats",
    "value": 
  ],
  [
    "name": "file_format",
    "value": 
  ],
  [
    "name": "cloud_storage_url",
    "value": 
  ],
  [
    "name": "webhook",
    "value": 
  ],
  [
    "name": "webhook_id",
    "value": 
  ],
  [
    "name": "temperature",
    "value": 
  ],
  [
    "name": "seed",
    "value": 
  ],
  [
    "name": "use_multi_channel",
    "value": 
  ],
  [
    "name": "webhook_metadata",
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/speech-to-text")! as URL,
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

```typescript Multichannel response
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.speechToText.convert({});
}
main();

```

```python Multichannel response
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.speech_to_text.convert()

```

```go Multichannel response
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/speech-to-text"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

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

```ruby Multichannel response
require 'uri'
require 'net/http'

url = URI("https://api.elevenlabs.io/v1/speech-to-text")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java Multichannel response
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/speech-to-text")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php Multichannel response
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/speech-to-text', [
  'multipart' => [
    [
        'name' => 'model_id',
        'contents' => 'string'
    ],
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

```csharp Multichannel response
var client = new RestClient("https://api.elevenlabs.io/v1/speech-to-text");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift Multichannel response
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "multipart/form-data; boundary=---011000010111000001101001"
]
let parameters = [
  [
    "name": "model_id",
    "value": "string"
  ],
  [
    "name": "file",
    "fileName": "<file1>"
  ],
  [
    "name": "language_code",
    "value": 
  ],
  [
    "name": "tag_audio_events",
    "value": 
  ],
  [
    "name": "num_speakers",
    "value": 
  ],
  [
    "name": "timestamps_granularity",
    "value": 
  ],
  [
    "name": "diarize",
    "value": 
  ],
  [
    "name": "diarization_threshold",
    "value": 
  ],
  [
    "name": "additional_formats",
    "value": 
  ],
  [
    "name": "file_format",
    "value": 
  ],
  [
    "name": "cloud_storage_url",
    "value": 
  ],
  [
    "name": "webhook",
    "value": 
  ],
  [
    "name": "webhook_id",
    "value": 
  ],
  [
    "name": "temperature",
    "value": 
  ],
  [
    "name": "seed",
    "value": 
  ],
  [
    "name": "use_multi_channel",
    "value": 
  ],
  [
    "name": "webhook_metadata",
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/speech-to-text")! as URL,
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

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.speechToText.convert({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.speech_to_text.convert()

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

	url := "https://api.elevenlabs.io/v1/speech-to-text"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

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

url = URI("https://api.elevenlabs.io/v1/speech-to-text")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/speech-to-text")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/speech-to-text', [
  'multipart' => [
    [
        'name' => 'model_id',
        'contents' => 'string'
    ],
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
var client = new RestClient("https://api.elevenlabs.io/v1/speech-to-text");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nstring\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"tag_audio_events\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"num_speakers\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"timestamps_granularity\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarize\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"diarization_threshold\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"additional_formats\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file_format\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"cloud_storage_url\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_id\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"temperature\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"seed\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"use_multi_channel\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"webhook_metadata\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
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
    "name": "model_id",
    "value": "string"
  ],
  [
    "name": "file",
    "fileName": "<file1>"
  ],
  [
    "name": "language_code",
    "value": 
  ],
  [
    "name": "tag_audio_events",
    "value": 
  ],
  [
    "name": "num_speakers",
    "value": 
  ],
  [
    "name": "timestamps_granularity",
    "value": 
  ],
  [
    "name": "diarize",
    "value": 
  ],
  [
    "name": "diarization_threshold",
    "value": 
  ],
  [
    "name": "additional_formats",
    "value": 
  ],
  [
    "name": "file_format",
    "value": 
  ],
  [
    "name": "cloud_storage_url",
    "value": 
  ],
  [
    "name": "webhook",
    "value": 
  ],
  [
    "name": "webhook_id",
    "value": 
  ],
  [
    "name": "temperature",
    "value": 
  ],
  [
    "name": "seed",
    "value": 
  ],
  [
    "name": "use_multi_channel",
    "value": 
  ],
  [
    "name": "webhook_metadata",
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/speech-to-text")! as URL,
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