# Create Podcast

POST https://api.elevenlabs.io/v1/studio/podcasts
Content-Type: application/json

Create and auto-convert a podcast project. Currently, the LLM cost is covered by us but you will still be charged for the audio generation. In the future, you will be charged for both the LLM and audio generation costs.

Reference: https://elevenlabs.io/docs/api-reference/studio/create-podcast

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create Podcast
  version: endpoint_studio.create_podcast
paths:
  /v1/studio/podcasts:
    post:
      operationId: create-podcast
      summary: Create Podcast
      description: >-
        Create and auto-convert a podcast project. Currently, the LLM cost is
        covered by us but you will still be charged for the audio generation. In
        the future, you will be charged for both the LLM and audio generation
        costs.
      tags:
        - - subpackage_studio
      parameters:
        - name: xi-api-key
          in: header
          required: true
          schema:
            type: string
        - name: safety-identifier
          in: header
          description: >-
            Used for moderation. Your workspace must be allowlisted to use this
            feature.
          required: false
          schema:
            type:
              - string
              - 'null'
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PodcastProjectResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Body_Create_podcast_v1_studio_podcasts_post'
components:
  schemas:
    PodcastConversationModeData:
      type: object
      properties:
        host_voice_id:
          type: string
          description: The ID of the host voice.
        guest_voice_id:
          type: string
          description: The ID of the guest voice.
      required:
        - host_voice_id
        - guest_voice_id
    PodcastConversationMode:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: conversation
          description: The type of podcast to create.
        conversation:
          $ref: '#/components/schemas/PodcastConversationModeData'
          description: The voice settings for the conversation.
      required:
        - type
        - conversation
    PodcastBulletinModeData:
      type: object
      properties:
        host_voice_id:
          type: string
          description: The ID of the host voice.
      required:
        - host_voice_id
    PodcastBulletinMode:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: bulletin
          description: The type of podcast to create.
        bulletin:
          $ref: '#/components/schemas/PodcastBulletinModeData'
          description: The voice settings for the bulletin.
      required:
        - type
        - bulletin
    BodyCreatePodcastV1StudioPodcastsPostMode:
      oneOf:
        - $ref: '#/components/schemas/PodcastConversationMode'
        - $ref: '#/components/schemas/PodcastBulletinMode'
    PodcastTextSource:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: text
          description: The type of source to create.
        text:
          type: string
          description: The text to create the podcast from.
      required:
        - type
        - text
    PodcastURLSource:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: url
          description: The type of source to create.
        url:
          type: string
          description: The URL to create the podcast from.
      required:
        - type
        - url
    BodyCreatePodcastV1StudioPodcastsPostSourceOneOf2Items:
      oneOf:
        - $ref: '#/components/schemas/PodcastTextSource'
        - $ref: '#/components/schemas/PodcastURLSource'
    BodyCreatePodcastV1StudioPodcastsPostSource2:
      type: array
      items:
        $ref: >-
          #/components/schemas/BodyCreatePodcastV1StudioPodcastsPostSourceOneOf2Items
    BodyCreatePodcastV1StudioPodcastsPostSource:
      oneOf:
        - $ref: '#/components/schemas/PodcastTextSource'
        - $ref: '#/components/schemas/PodcastURLSource'
        - $ref: '#/components/schemas/BodyCreatePodcastV1StudioPodcastsPostSource2'
    BodyCreatePodcastV1StudioPodcastsPostQualityPreset:
      type: string
      enum:
        - value: standard
        - value: high
        - value: highest
        - value: ultra
        - value: ultra_lossless
      default: standard
    BodyCreatePodcastV1StudioPodcastsPostDurationScale:
      type: string
      enum:
        - value: short
        - value: default
        - value: long
      default: default
    BodyCreatePodcastV1StudioPodcastsPostApplyTextNormalization:
      type: string
      enum:
        - value: auto
        - value: 'on'
        - value: 'off'
        - value: apply_english
    Body_Create_podcast_v1_studio_podcasts_post:
      type: object
      properties:
        model_id:
          type: string
          description: >-
            The ID of the model to be used for this Studio project, you can
            query GET /v1/models to list all available models.
        mode:
          $ref: '#/components/schemas/BodyCreatePodcastV1StudioPodcastsPostMode'
          description: >-
            The type of podcast to generate. Can be 'conversation', an
            interaction between two voices, or 'bulletin', a monologue.
        source:
          $ref: '#/components/schemas/BodyCreatePodcastV1StudioPodcastsPostSource'
          description: The source content for the Podcast.
        quality_preset:
          $ref: >-
            #/components/schemas/BodyCreatePodcastV1StudioPodcastsPostQualityPreset
          description: >
            Output quality of the generated audio. Must be one of:

            standard - standard output format, 128kbps with 44.1kHz sample rate.

            high - high quality output format, 192kbps with 44.1kHz sample rate
            and major improvements on our side.

            ultra - ultra quality output format, 192kbps with 44.1kHz sample
            rate and highest improvements on our side.

            ultra lossless - ultra quality output format, 705.6kbps with 44.1kHz
            sample rate and highest improvements on our side in a fully lossless
            format.
        duration_scale:
          $ref: >-
            #/components/schemas/BodyCreatePodcastV1StudioPodcastsPostDurationScale
          description: |
            Duration of the generated podcast. Must be one of:
            short - produces podcasts shorter than 3 minutes.
            default - produces podcasts roughly between 3-7 minutes.
            long - produces podcasts longer than 7 minutes.
        language:
          type:
            - string
            - 'null'
          description: >-
            An optional language of the Studio project. Two-letter language code
            (ISO 639-1).
        intro:
          type:
            - string
            - 'null'
          description: >-
            The intro text that will always be added to the beginning of the
            podcast.
        outro:
          type:
            - string
            - 'null'
          description: The outro text that will always be added to the end of the podcast.
        instructions_prompt:
          type:
            - string
            - 'null'
          description: >-
            Additional instructions prompt for the podcast generation used to
            adjust the podcast's style and tone.
        highlights:
          type:
            - array
            - 'null'
          items:
            type: string
          description: >-
            A brief summary or highlights of the Studio project's content,
            providing key points or themes. This should be between 10 and 70
            characters.
        callback_url:
          type:
            - string
            - 'null'
          description: |2-

                A url that will be called by our service when the Studio project is converted. Request will contain a json blob containing the status of the conversion
                Messages:
                1. When project was converted successfully:
                {
                  type: "project_conversion_status",
                  event_timestamp: 1234567890,
                  data: {
                    request_id: "1234567890",
                    project_id: "21m00Tcm4TlvDq8ikWAM",
                    conversion_status: "success",
                    project_snapshot_id: "22m00Tcm4TlvDq8ikMAT",
                    error_details: None,
                  }
                }
                2. When project conversion failed:
                {
                  type: "project_conversion_status",
                  event_timestamp: 1234567890,
                  data: {
                    request_id: "1234567890",
                    project_id: "21m00Tcm4TlvDq8ikWAM",
                    conversion_status: "error",
                    project_snapshot_id: None,
                    error_details: "Error details if conversion failed"
                  }
                }

                3. When chapter was converted successfully:
                {
                  type: "chapter_conversion_status",
                  event_timestamp: 1234567890,
                  data: {
                    request_id: "1234567890",
                    project_id: "21m00Tcm4TlvDq8ikWAM",
                    chapter_id: "22m00Tcm4TlvDq8ikMAT",
                    conversion_status: "success",
                    chapter_snapshot_id: "23m00Tcm4TlvDq8ikMAV",
                    error_details: None,
                  }
                }
                4. When chapter conversion failed:
                {
                  type: "chapter_conversion_status",
                  event_timestamp: 1234567890,
                  data: {
                    request_id: "1234567890",
                    project_id: "21m00Tcm4TlvDq8ikWAM",
                    chapter_id: "22m00Tcm4TlvDq8ikMAT",
                    conversion_status: "error",
                    chapter_snapshot_id: None,
                    error_details: "Error details if conversion failed"
                  }
                }
                
        apply_text_normalization:
          oneOf:
            - $ref: >-
                #/components/schemas/BodyCreatePodcastV1StudioPodcastsPostApplyTextNormalization
            - type: 'null'
          description: |2-

                This parameter controls text normalization with four modes: 'auto', 'on', 'apply_english' and 'off'.
                When set to 'auto', the system will automatically decide whether to apply text normalization
                (e.g., spelling out numbers). With 'on', text normalization will always be applied, while
                with 'off', it will be skipped. 'apply_english' is the same as 'on' but will assume that text is in English.
                
      required:
        - model_id
        - mode
        - source
    ProjectResponseModelTargetAudience:
      type: string
      enum:
        - value: children
        - value: young adult
        - value: adult
        - value: all ages
    ProjectState:
      type: string
      enum:
        - value: creating
        - value: default
        - value: converting
        - value: in_queue
    ProjectResponseModelAccessLevel:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    ProjectResponseModelFiction:
      type: string
      enum:
        - value: fiction
        - value: non-fiction
    ProjectCreationMetaResponseModelStatus:
      type: string
      enum:
        - value: pending
        - value: creating
        - value: finished
        - value: failed
    ProjectCreationMetaResponseModelType:
      type: string
      enum:
        - value: blank
        - value: generate_podcast
        - value: auto_assign_voices
    ProjectCreationMetaResponseModel:
      type: object
      properties:
        creation_progress:
          type: number
          format: double
          description: The progress of the project creation.
        status:
          $ref: '#/components/schemas/ProjectCreationMetaResponseModelStatus'
          description: The status of the project creation action.
        type:
          $ref: '#/components/schemas/ProjectCreationMetaResponseModelType'
          description: The type of the project creation action.
      required:
        - creation_progress
        - status
        - type
    ProjectResponseModelSourceType:
      type: string
      enum:
        - value: blank
        - value: book
        - value: article
        - value: genfm
        - value: video
        - value: screenplay
    CaptionStyleTemplateModel:
      type: object
      properties:
        key:
          type: string
        label:
          type: string
        requires_high_fps:
          type: boolean
          default: false
      required:
        - key
        - label
    CaptionStyleModelTextAlign:
      type: string
      enum:
        - value: start
        - value: center
        - value: end
    CaptionStyleModelTextStyle:
      type: string
      enum:
        - value: normal
        - value: italic
    CaptionStyleModelTextWeight:
      type: string
      enum:
        - value: normal
        - value: bold
    CaptionStyleSectionAnimationModelEnterType:
      type: string
      enum:
        - value: none
        - value: fade
        - value: scale
    CaptionStyleSectionAnimationModelExitType:
      type: string
      enum:
        - value: none
        - value: fade
        - value: scale
    CaptionStyleSectionAnimationModel:
      type: object
      properties:
        enter_type:
          $ref: '#/components/schemas/CaptionStyleSectionAnimationModelEnterType'
        exit_type:
          $ref: '#/components/schemas/CaptionStyleSectionAnimationModelExitType'
      required:
        - enter_type
        - exit_type
    CaptionStyleWordAnimationModelEnterType:
      type: string
      enum:
        - value: none
        - value: fade
        - value: scale
    CaptionStyleWordAnimationModelExitType:
      type: string
      enum:
        - value: none
        - value: fade
        - value: scale
    CaptionStyleWordAnimationModel:
      type: object
      properties:
        enter_type:
          $ref: '#/components/schemas/CaptionStyleWordAnimationModelEnterType'
        exit_type:
          $ref: '#/components/schemas/CaptionStyleWordAnimationModelExitType'
      required:
        - enter_type
        - exit_type
    CaptionStyleCharacterAnimationModelEnterType:
      type: string
      enum:
        - value: none
        - value: fade
    CaptionStyleCharacterAnimationModelExitType:
      type: string
      enum:
        - value: none
        - value: fade
    CaptionStyleCharacterAnimationModel:
      type: object
      properties:
        enter_type:
          $ref: '#/components/schemas/CaptionStyleCharacterAnimationModelEnterType'
        exit_type:
          $ref: '#/components/schemas/CaptionStyleCharacterAnimationModelExitType'
      required:
        - enter_type
        - exit_type
    CaptionStyleHorizontalPlacementModelAlign:
      type: string
      enum:
        - value: left
        - value: center
        - value: right
    CaptionStyleHorizontalPlacementModel:
      type: object
      properties:
        align:
          $ref: '#/components/schemas/CaptionStyleHorizontalPlacementModelAlign'
        translate_pct:
          type: number
          format: double
      required:
        - align
        - translate_pct
    CaptionStyleVerticalPlacementModelAlign:
      type: string
      enum:
        - value: top
        - value: center
        - value: bottom
    CaptionStyleVerticalPlacementModel:
      type: object
      properties:
        align:
          $ref: '#/components/schemas/CaptionStyleVerticalPlacementModelAlign'
        translate_pct:
          type: number
          format: double
      required:
        - align
        - translate_pct
    CaptionStyleModel:
      type: object
      properties:
        template:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleTemplateModel'
            - type: 'null'
        text_font:
          type:
            - string
            - 'null'
        text_scale:
          type:
            - number
            - 'null'
          format: double
        text_color:
          type:
            - string
            - 'null'
        text_align:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleModelTextAlign'
            - type: 'null'
        text_style:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleModelTextStyle'
            - type: 'null'
        text_weight:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleModelTextWeight'
            - type: 'null'
        background_enabled:
          type:
            - boolean
            - 'null'
        background_color:
          type:
            - string
            - 'null'
        background_opacity:
          type:
            - number
            - 'null'
          format: double
        word_highlights_enabled:
          type:
            - boolean
            - 'null'
        word_highlights_color:
          type:
            - string
            - 'null'
        word_highlights_background_color:
          type:
            - string
            - 'null'
        word_highlights_opacity:
          type:
            - number
            - 'null'
          format: double
        section_animation:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleSectionAnimationModel'
            - type: 'null'
        word_animation:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleWordAnimationModel'
            - type: 'null'
        character_animation:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleCharacterAnimationModel'
            - type: 'null'
        width_pct:
          type:
            - number
            - 'null'
          format: double
        horizontal_placement:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleHorizontalPlacementModel'
            - type: 'null'
        vertical_placement:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleVerticalPlacementModel'
            - type: 'null'
        auto_break_enabled:
          type:
            - boolean
            - 'null'
        max_lines_per_section:
          type:
            - integer
            - 'null'
        max_words_per_line:
          type:
            - integer
            - 'null'
    ProjectResponseModelAspectRatio:
      type: string
      enum:
        - value: '16:9'
        - value: '9:16'
        - value: '4:5'
        - value: '1:1'
    ProjectResponseModel:
      type: object
      properties:
        project_id:
          type: string
          description: The ID of the project.
        name:
          type: string
          description: The name of the project.
        create_date_unix:
          type: integer
          description: The creation date of the project.
        created_by_user_id:
          type:
            - string
            - 'null'
          description: The user ID who created the project.
        default_title_voice_id:
          type: string
          description: The default title voice ID.
        default_paragraph_voice_id:
          type: string
          description: The default paragraph voice ID.
        default_model_id:
          type: string
          description: The default model ID.
        last_conversion_date_unix:
          type:
            - integer
            - 'null'
          description: The last conversion date of the project.
        can_be_downloaded:
          type: boolean
          description: Whether the project can be downloaded.
        title:
          type:
            - string
            - 'null'
          description: The title of the project.
        author:
          type:
            - string
            - 'null'
          description: The author of the project.
        description:
          type:
            - string
            - 'null'
          description: The description of the project.
        genres:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of genres of the project.
        cover_image_url:
          type:
            - string
            - 'null'
          description: The cover image URL of the project.
        target_audience:
          oneOf:
            - $ref: '#/components/schemas/ProjectResponseModelTargetAudience'
            - type: 'null'
          description: The target audience of the project.
        language:
          type:
            - string
            - 'null'
          description: Two-letter language code (ISO 639-1) of the language of the project.
        content_type:
          type:
            - string
            - 'null'
          description: The content type of the project, e.g. 'Novel' or 'Short Story'
        original_publication_date:
          type:
            - string
            - 'null'
          description: The original publication date of the project.
        mature_content:
          type:
            - boolean
            - 'null'
          description: Whether the project contains mature content.
        isbn_number:
          type:
            - string
            - 'null'
          description: The ISBN number of the project.
        volume_normalization:
          type: boolean
          description: Whether the project uses volume normalization.
        state:
          $ref: '#/components/schemas/ProjectState'
          description: The state of the project.
        access_level:
          $ref: '#/components/schemas/ProjectResponseModelAccessLevel'
          description: The access level of the project.
        fiction:
          oneOf:
            - $ref: '#/components/schemas/ProjectResponseModelFiction'
            - type: 'null'
          description: Whether the project is fiction.
        quality_check_on:
          type: boolean
          description: Whether quality check is enabled for this project.
        quality_check_on_when_bulk_convert:
          type: boolean
          description: >-
            Whether quality check is enabled on the project when bulk
            converting.
        creation_meta:
          oneOf:
            - $ref: '#/components/schemas/ProjectCreationMetaResponseModel'
            - type: 'null'
          description: The creation meta of the project.
        source_type:
          oneOf:
            - $ref: '#/components/schemas/ProjectResponseModelSourceType'
            - type: 'null'
          description: The source type of the project.
        chapters_enabled:
          type:
            - boolean
            - 'null'
          default: true
          description: Whether chapters are enabled for the project.
        captions_enabled:
          type:
            - boolean
            - 'null'
          default: true
          description: Whether captions are enabled for the project.
        caption_style:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleModel'
            - type: 'null'
          description: Global styling to be applied to all captions
        public_share_id:
          type:
            - string
            - 'null'
          description: The public share ID of the project.
        aspect_ratio:
          oneOf:
            - $ref: '#/components/schemas/ProjectResponseModelAspectRatio'
            - type: 'null'
          description: The aspect ratio of the project.
      required:
        - project_id
        - name
        - create_date_unix
        - created_by_user_id
        - default_title_voice_id
        - default_paragraph_voice_id
        - default_model_id
        - can_be_downloaded
        - volume_normalization
        - state
        - access_level
        - quality_check_on
        - quality_check_on_when_bulk_convert
    PodcastProjectResponseModel:
      type: object
      properties:
        project:
          $ref: '#/components/schemas/ProjectResponseModel'
          description: The project associated with the created podcast.
      required:
        - project

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.studio.createPodcast({
        modelId: "eleven_multilingual_v2",
        mode: {
            type: "conversation",
            conversation: {
                hostVoiceId: "6lCwbsX1yVjD49QmpkTR",
                guestVoiceId: "bYTqZQo3Jz7LQtmGTgwi",
            },
        },
        source: {
            type: "url",
        },
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.studio.create_podcast(
    model_id="eleven_multilingual_v2",
    mode={
        "type": "conversation",
        "conversation": {
            "host_voice_id": "6lCwbsX1yVjD49QmpkTR",
            "guest_voice_id": "bYTqZQo3Jz7LQtmGTgwi"
        }
    },
    source={
        "type": "url"
    }
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

	url := "https://api.elevenlabs.io/v1/studio/podcasts"

	payload := strings.NewReader("{\n  \"model_id\": \"eleven_multilingual_v2\",\n  \"mode\": {\n    \"type\": \"conversation\",\n    \"conversation\": {\n      \"host_voice_id\": \"6lCwbsX1yVjD49QmpkTR\",\n      \"guest_voice_id\": \"bYTqZQo3Jz7LQtmGTgwi\"\n    }\n  },\n  \"source\": {\n    \"type\": \"url\",\n    \"url\": \"https://en.wikipedia.org/wiki/Cognitive_science\"\n  }\n}")

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

url = URI("https://api.elevenlabs.io/v1/studio/podcasts")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"model_id\": \"eleven_multilingual_v2\",\n  \"mode\": {\n    \"type\": \"conversation\",\n    \"conversation\": {\n      \"host_voice_id\": \"6lCwbsX1yVjD49QmpkTR\",\n      \"guest_voice_id\": \"bYTqZQo3Jz7LQtmGTgwi\"\n    }\n  },\n  \"source\": {\n    \"type\": \"url\",\n    \"url\": \"https://en.wikipedia.org/wiki/Cognitive_science\"\n  }\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/studio/podcasts")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"model_id\": \"eleven_multilingual_v2\",\n  \"mode\": {\n    \"type\": \"conversation\",\n    \"conversation\": {\n      \"host_voice_id\": \"6lCwbsX1yVjD49QmpkTR\",\n      \"guest_voice_id\": \"bYTqZQo3Jz7LQtmGTgwi\"\n    }\n  },\n  \"source\": {\n    \"type\": \"url\",\n    \"url\": \"https://en.wikipedia.org/wiki/Cognitive_science\"\n  }\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/studio/podcasts', [
  'body' => '{
  "model_id": "eleven_multilingual_v2",
  "mode": {
    "type": "conversation",
    "conversation": {
      "host_voice_id": "6lCwbsX1yVjD49QmpkTR",
      "guest_voice_id": "bYTqZQo3Jz7LQtmGTgwi"
    }
  },
  "source": {
    "type": "url",
    "url": "https://en.wikipedia.org/wiki/Cognitive_science"
  }
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/studio/podcasts");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"model_id\": \"eleven_multilingual_v2\",\n  \"mode\": {\n    \"type\": \"conversation\",\n    \"conversation\": {\n      \"host_voice_id\": \"6lCwbsX1yVjD49QmpkTR\",\n      \"guest_voice_id\": \"bYTqZQo3Jz7LQtmGTgwi\"\n    }\n  },\n  \"source\": {\n    \"type\": \"url\",\n    \"url\": \"https://en.wikipedia.org/wiki/Cognitive_science\"\n  }\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [
  "model_id": "eleven_multilingual_v2",
  "mode": [
    "type": "conversation",
    "conversation": [
      "host_voice_id": "6lCwbsX1yVjD49QmpkTR",
      "guest_voice_id": "bYTqZQo3Jz7LQtmGTgwi"
    ]
  ],
  "source": [
    "type": "url",
    "url": "https://en.wikipedia.org/wiki/Cognitive_science"
  ]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/studio/podcasts")! as URL,
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