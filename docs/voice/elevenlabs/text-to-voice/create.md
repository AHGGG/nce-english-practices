# Create a voice

POST https://api.elevenlabs.io/v1/text-to-voice
Content-Type: application/json

Create a voice from previously generated voice preview. This endpoint should be called after you fetched a generated_voice_id using POST /v1/text-to-voice/design or POST /v1/text-to-voice/:voice_id/remix.

Reference: https://elevenlabs.io/docs/api-reference/text-to-voice/create

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create A New Voice From Voice Preview
  version: endpoint_textToVoice.create
paths:
  /v1/text-to-voice:
    post:
      operationId: create
      summary: Create A New Voice From Voice Preview
      description: >-
        Create a voice from previously generated voice preview. This endpoint
        should be called after you fetched a generated_voice_id using POST
        /v1/text-to-voice/design or POST /v1/text-to-voice/:voice_id/remix.
      tags:
        - - subpackage_textToVoice
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
                $ref: '#/components/schemas/VoiceResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_Create_a_new_voice_from_voice_preview_v1_text_to_voice_post
components:
  schemas:
    Body_Create_a_new_voice_from_voice_preview_v1_text_to_voice_post:
      type: object
      properties:
        voice_name:
          type: string
          description: Name to use for the created voice.
        voice_description:
          type: string
          description: Description to use for the created voice.
        generated_voice_id:
          type: string
          description: >-
            The generated_voice_id to create, call POST
            /v1/text-to-voice/create-previews and fetch the generated_voice_id
            from the response header if don't have one yet.
        labels:
          type:
            - object
            - 'null'
          additionalProperties:
            type: string
          description: Optional, metadata to add to the created voice. Defaults to None.
        played_not_selected_voice_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: >-
            List of voice ids that the user has played but not selected. Used
            for RLHF.
      required:
        - voice_name
        - voice_description
        - generated_voice_id
    SpeakerSeparationResponseModelStatus:
      type: string
      enum:
        - value: not_started
        - value: pending
        - value: completed
        - value: failed
    UtteranceResponseModel:
      type: object
      properties:
        start:
          type: number
          format: double
          description: The start time of the utterance in seconds.
        end:
          type: number
          format: double
          description: The end time of the utterance in seconds.
      required:
        - start
        - end
    SpeakerResponseModel:
      type: object
      properties:
        speaker_id:
          type: string
          description: The ID of the speaker.
        duration_secs:
          type: number
          format: double
          description: The duration of the speaker segment in seconds.
        utterances:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/UtteranceResponseModel'
          description: The utterances of the speaker.
      required:
        - speaker_id
        - duration_secs
    SpeakerSeparationResponseModel:
      type: object
      properties:
        voice_id:
          type: string
          description: The ID of the voice.
        sample_id:
          type: string
          description: The ID of the sample.
        status:
          $ref: '#/components/schemas/SpeakerSeparationResponseModelStatus'
          description: The status of the speaker separation.
        speakers:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: '#/components/schemas/SpeakerResponseModel'
          description: The speakers of the sample.
        selected_speaker_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: The IDs of the selected speakers.
      required:
        - voice_id
        - sample_id
        - status
    SampleResponseModel:
      type: object
      properties:
        sample_id:
          type: string
          description: The ID of the sample.
        file_name:
          type: string
          description: The name of the sample file.
        mime_type:
          type: string
          description: The MIME type of the sample file.
        size_bytes:
          type: integer
          description: The size of the sample file in bytes.
        hash:
          type: string
          description: The hash of the sample file.
        duration_secs:
          type:
            - number
            - 'null'
          format: double
        remove_background_noise:
          type:
            - boolean
            - 'null'
        has_isolated_audio:
          type:
            - boolean
            - 'null'
        has_isolated_audio_preview:
          type:
            - boolean
            - 'null'
        speaker_separation:
          oneOf:
            - $ref: '#/components/schemas/SpeakerSeparationResponseModel'
            - type: 'null'
        trim_start:
          type:
            - integer
            - 'null'
        trim_end:
          type:
            - integer
            - 'null'
    VoiceResponseModelCategory:
      type: string
      enum:
        - value: generated
        - value: cloned
        - value: premade
        - value: professional
        - value: famous
        - value: high_quality
    FineTuningResponseModelState:
      type: string
      enum:
        - value: not_started
        - value: queued
        - value: fine_tuning
        - value: fine_tuned
        - value: failed
        - value: delayed
    RecordingResponseModel:
      type: object
      properties:
        recording_id:
          type: string
          description: The ID of the recording.
        mime_type:
          type: string
          description: The MIME type of the recording.
        size_bytes:
          type: integer
          description: The size of the recording in bytes.
        upload_date_unix:
          type: integer
          description: The date of the recording in Unix time.
        transcription:
          type: string
          description: The transcription of the recording.
      required:
        - recording_id
        - mime_type
        - size_bytes
        - upload_date_unix
        - transcription
    VerificationAttemptResponseModel:
      type: object
      properties:
        text:
          type: string
          description: The text of the verification attempt.
        date_unix:
          type: integer
          description: The date of the verification attempt in Unix time.
        accepted:
          type: boolean
          description: Whether the verification attempt was accepted.
        similarity:
          type: number
          format: double
          description: The similarity of the verification attempt.
        levenshtein_distance:
          type: number
          format: double
          description: The Levenshtein distance of the verification attempt.
        recording:
          oneOf:
            - $ref: '#/components/schemas/RecordingResponseModel'
            - type: 'null'
          description: The recording of the verification attempt.
      required:
        - text
        - date_unix
        - accepted
        - similarity
        - levenshtein_distance
    ManualVerificationFileResponseModel:
      type: object
      properties:
        file_id:
          type: string
          description: The ID of the file.
        file_name:
          type: string
          description: The name of the file.
        mime_type:
          type: string
          description: The MIME type of the file.
        size_bytes:
          type: integer
          description: The size of the file in bytes.
        upload_date_unix:
          type: integer
          description: The date of the file in Unix time.
      required:
        - file_id
        - file_name
        - mime_type
        - size_bytes
        - upload_date_unix
    ManualVerificationResponseModel:
      type: object
      properties:
        extra_text:
          type: string
          description: The extra text of the manual verification.
        request_time_unix:
          type: integer
          description: The date of the manual verification in Unix time.
        files:
          type: array
          items:
            $ref: '#/components/schemas/ManualVerificationFileResponseModel'
          description: The files of the manual verification.
      required:
        - extra_text
        - request_time_unix
        - files
    FineTuningResponseModel:
      type: object
      properties:
        is_allowed_to_fine_tune:
          type: boolean
          description: Whether the user is allowed to fine-tune the voice.
        state:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/FineTuningResponseModelState'
          description: The state of the fine-tuning process for each model.
        verification_failures:
          type: array
          items:
            type: string
          description: List of verification failures in the fine-tuning process.
        verification_attempts_count:
          type: integer
          description: The number of verification attempts in the fine-tuning process.
        manual_verification_requested:
          type: boolean
          description: >-
            Whether a manual verification was requested for the fine-tuning
            process.
        language:
          type:
            - string
            - 'null'
          description: The language of the fine-tuning process.
        progress:
          type:
            - object
            - 'null'
          additionalProperties:
            type: number
            format: double
          description: The progress of the fine-tuning process.
        message:
          type:
            - object
            - 'null'
          additionalProperties:
            type: string
          description: The message of the fine-tuning process.
        dataset_duration_seconds:
          type:
            - number
            - 'null'
          format: double
          description: The duration of the dataset in seconds.
        verification_attempts:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/VerificationAttemptResponseModel'
          description: The number of verification attempts.
        slice_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of slice IDs.
        manual_verification:
          oneOf:
            - $ref: '#/components/schemas/ManualVerificationResponseModel'
            - type: 'null'
          description: The manual verification of the fine-tuning process.
        max_verification_attempts:
          type:
            - integer
            - 'null'
          description: The maximum number of verification attempts.
        next_max_verification_attempts_reset_unix_ms:
          type:
            - integer
            - 'null'
          description: >-
            The next maximum verification attempts reset time in Unix
            milliseconds.
        finetuning_state:
          description: Any type
    VoiceSettingsResponseModel:
      type: object
      properties:
        stability:
          type:
            - number
            - 'null'
          format: double
          default: 0.5
          description: >-
            Determines how stable the voice is and the randomness between each
            generation. Lower values introduce broader emotional range for the
            voice. Higher values can result in a monotonous voice with limited
            emotion.
        use_speaker_boost:
          type:
            - boolean
            - 'null'
          default: true
          description: >-
            This setting boosts the similarity to the original speaker. Using
            this setting requires a slightly higher computational load, which in
            turn increases latency.
        similarity_boost:
          type:
            - number
            - 'null'
          format: double
          default: 0.75
          description: >-
            Determines how closely the AI should adhere to the original voice
            when attempting to replicate it.
        style:
          type:
            - number
            - 'null'
          format: double
          default: 0
          description: >-
            Determines the style exaggeration of the voice. This setting
            attempts to amplify the style of the original speaker. It does
            consume additional computational resources and might increase
            latency if set to anything other than 0.
        speed:
          type:
            - number
            - 'null'
          format: double
          default: 1
          description: >-
            Adjusts the speed of the voice. A value of 1.0 is the default speed,
            while values less than 1.0 slow down the speech, and values greater
            than 1.0 speed it up.
    voice_sharing_state:
      type: string
      enum:
        - value: enabled
        - value: disabled
        - value: copied
        - value: copied_disabled
    VoiceSharingResponseModelCategory:
      type: string
      enum:
        - value: generated
        - value: cloned
        - value: premade
        - value: professional
        - value: famous
        - value: high_quality
    review_status:
      type: string
      enum:
        - value: not_requested
        - value: pending
        - value: declined
        - value: allowed
        - value: allowed_with_changes
    VoiceSharingModerationCheckResponseModel:
      type: object
      properties:
        date_checked_unix:
          type:
            - integer
            - 'null'
          description: The date the moderation check was made in Unix time.
        name_value:
          type:
            - string
            - 'null'
          description: The name value of the voice.
        name_check:
          type:
            - boolean
            - 'null'
          description: Whether the name check was successful.
        description_value:
          type:
            - string
            - 'null'
          description: The description value of the voice.
        description_check:
          type:
            - boolean
            - 'null'
          description: Whether the description check was successful.
        sample_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of sample IDs.
        sample_checks:
          type:
            - array
            - 'null'
          items:
            type: number
            format: double
          description: A list of sample checks.
        captcha_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of captcha IDs.
        captcha_checks:
          type:
            - array
            - 'null'
          items:
            type: number
            format: double
          description: A list of CAPTCHA check values.
    ReaderResourceResponseModelResourceType:
      type: string
      enum:
        - value: read
        - value: collection
    ReaderResourceResponseModel:
      type: object
      properties:
        resource_type:
          $ref: '#/components/schemas/ReaderResourceResponseModelResourceType'
          description: The type of resource.
        resource_id:
          type: string
          description: The ID of the resource.
      required:
        - resource_type
        - resource_id
    VoiceSharingResponseModel:
      type: object
      properties:
        status:
          $ref: '#/components/schemas/voice_sharing_state'
          description: The status of the voice sharing.
        history_item_sample_id:
          type:
            - string
            - 'null'
          description: The sample ID of the history item.
        date_unix:
          type: integer
          description: The date of the voice sharing in Unix time.
        whitelisted_emails:
          type: array
          items:
            type: string
          description: A list of whitelisted emails.
        public_owner_id:
          type: string
          description: The ID of the public owner.
        original_voice_id:
          type: string
          description: The ID of the original voice.
        financial_rewards_enabled:
          type: boolean
          description: Whether financial rewards are enabled.
        free_users_allowed:
          type: boolean
          description: Whether free users are allowed.
        live_moderation_enabled:
          type: boolean
          description: Whether live moderation is enabled.
        rate:
          type:
            - number
            - 'null'
          format: double
          description: The rate of the voice sharing.
        fiat_rate:
          type:
            - number
            - 'null'
          format: double
          description: The rate of the voice sharing in USD per 1000 credits.
        notice_period:
          type: integer
          description: The notice period of the voice sharing.
        disable_at_unix:
          type:
            - integer
            - 'null'
          description: The date of the voice sharing in Unix time.
        voice_mixing_allowed:
          type: boolean
          description: Whether voice mixing is allowed.
        featured:
          type: boolean
          description: Whether the voice is featured.
        category:
          $ref: '#/components/schemas/VoiceSharingResponseModelCategory'
          description: The category of the voice.
        reader_app_enabled:
          type:
            - boolean
            - 'null'
          description: Whether the reader app is enabled.
        image_url:
          type:
            - string
            - 'null'
          description: The image URL of the voice.
        ban_reason:
          type:
            - string
            - 'null'
          description: The ban reason of the voice.
        liked_by_count:
          type: integer
          description: The number of likes on the voice.
        cloned_by_count:
          type: integer
          description: The number of clones on the voice.
        name:
          type: string
          description: The name of the voice.
        description:
          type:
            - string
            - 'null'
          description: The description of the voice.
        labels:
          type: object
          additionalProperties:
            type: string
          description: The labels of the voice.
        review_status:
          $ref: '#/components/schemas/review_status'
          description: The review status of the voice.
        review_message:
          type:
            - string
            - 'null'
          description: The review message of the voice.
        enabled_in_library:
          type: boolean
          description: Whether the voice is enabled in the library.
        instagram_username:
          type:
            - string
            - 'null'
          description: The Instagram username of the voice.
        twitter_username:
          type:
            - string
            - 'null'
          description: The Twitter/X username of the voice.
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
        moderation_check:
          oneOf:
            - $ref: '#/components/schemas/VoiceSharingModerationCheckResponseModel'
            - type: 'null'
          description: The moderation check of the voice.
        reader_restricted_on:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/ReaderResourceResponseModel'
          description: The reader restricted on of the voice.
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
    VoiceResponseModelSafetyControl:
      type: string
      enum:
        - value: NONE
        - value: BAN
        - value: CAPTCHA
        - value: ENTERPRISE_BAN
        - value: ENTERPRISE_CAPTCHA
    VoiceVerificationResponseModel:
      type: object
      properties:
        requires_verification:
          type: boolean
          description: Whether the voice requires verification.
        is_verified:
          type: boolean
          description: Whether the voice has been verified.
        verification_failures:
          type: array
          items:
            type: string
          description: List of verification failures.
        verification_attempts_count:
          type: integer
          description: The number of verification attempts.
        language:
          type:
            - string
            - 'null'
          description: The language of the voice.
        verification_attempts:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/VerificationAttemptResponseModel'
          description: Number of times a verification was attempted.
      required:
        - requires_verification
        - is_verified
        - verification_failures
        - verification_attempts_count
    VoiceResponseModel:
      type: object
      properties:
        voice_id:
          type: string
          description: The ID of the voice.
        name:
          type: string
          description: The name of the voice.
        samples:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/SampleResponseModel'
          description: List of samples associated with the voice.
        category:
          $ref: '#/components/schemas/VoiceResponseModelCategory'
          description: The category of the voice.
        fine_tuning:
          oneOf:
            - $ref: '#/components/schemas/FineTuningResponseModel'
            - type: 'null'
          description: Fine-tuning information for the voice.
        labels:
          type: object
          additionalProperties:
            type: string
          description: Labels associated with the voice.
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
        available_for_tiers:
          type: array
          items:
            type: string
          description: The tiers the voice is available for.
        settings:
          oneOf:
            - $ref: '#/components/schemas/VoiceSettingsResponseModel'
            - type: 'null'
          description: The settings of the voice.
        sharing:
          oneOf:
            - $ref: '#/components/schemas/VoiceSharingResponseModel'
            - type: 'null'
          description: The sharing information of the voice.
        high_quality_base_model_ids:
          type: array
          items:
            type: string
          description: The base model IDs for high-quality voices.
        verified_languages:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/VerifiedVoiceLanguageResponseModel'
          description: The verified languages of the voice.
        safety_control:
          oneOf:
            - $ref: '#/components/schemas/VoiceResponseModelSafetyControl'
            - type: 'null'
          description: The safety controls of the voice.
        voice_verification:
          oneOf:
            - $ref: '#/components/schemas/VoiceVerificationResponseModel'
            - type: 'null'
          description: The voice verification of the voice.
        permission_on_resource:
          type:
            - string
            - 'null'
          description: The permission on the resource of the voice.
        is_owner:
          type:
            - boolean
            - 'null'
          description: Whether the voice is owned by the user.
        is_legacy:
          type: boolean
          default: false
          description: Whether the voice is legacy.
        is_mixed:
          type: boolean
          default: false
          description: Whether the voice is mixed.
        favorited_at_unix:
          type:
            - integer
            - 'null'
          description: Timestamp when the voice was marked as favorite in Unix time.
        created_at_unix:
          type:
            - integer
            - 'null'
          description: The creation time of the voice in Unix time.
      required:
        - voice_id

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.textToVoice.create({
        voiceName: "Sassy squeaky mouse",
        voiceDescription: "A sassy squeaky mouse",
        generatedVoiceId: "37HceQefKmEi3bGovXjL",
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.text_to_voice.create(
    voice_name="Sassy squeaky mouse",
    voice_description="A sassy squeaky mouse",
    generated_voice_id="37HceQefKmEi3bGovXjL"
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

	url := "https://api.elevenlabs.io/v1/text-to-voice"

	payload := strings.NewReader("{\n  \"voice_name\": \"Sassy squeaky mouse\",\n  \"voice_description\": \"A sassy squeaky mouse\",\n  \"generated_voice_id\": \"37HceQefKmEi3bGovXjL\"\n}")

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

url = URI("https://api.elevenlabs.io/v1/text-to-voice")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"voice_name\": \"Sassy squeaky mouse\",\n  \"voice_description\": \"A sassy squeaky mouse\",\n  \"generated_voice_id\": \"37HceQefKmEi3bGovXjL\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/text-to-voice")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"voice_name\": \"Sassy squeaky mouse\",\n  \"voice_description\": \"A sassy squeaky mouse\",\n  \"generated_voice_id\": \"37HceQefKmEi3bGovXjL\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/text-to-voice', [
  'body' => '{
  "voice_name": "Sassy squeaky mouse",
  "voice_description": "A sassy squeaky mouse",
  "generated_voice_id": "37HceQefKmEi3bGovXjL"
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/text-to-voice");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"voice_name\": \"Sassy squeaky mouse\",\n  \"voice_description\": \"A sassy squeaky mouse\",\n  \"generated_voice_id\": \"37HceQefKmEi3bGovXjL\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [
  "voice_name": "Sassy squeaky mouse",
  "voice_description": "A sassy squeaky mouse",
  "generated_voice_id": "37HceQefKmEi3bGovXjL"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/text-to-voice")! as URL,
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