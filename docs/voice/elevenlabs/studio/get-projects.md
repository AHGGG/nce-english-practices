# List Studio Projects

GET https://api.elevenlabs.io/v1/studio/projects

Returns a list of your Studio projects with metadata.

Reference: https://elevenlabs.io/docs/api-reference/studio/get-projects

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Studio Projects
  version: endpoint_studio/projects.list
paths:
  /v1/studio/projects:
    get:
      operationId: list
      summary: List Studio Projects
      description: Returns a list of your Studio projects with metadata.
      tags:
        - - subpackage_studio
          - subpackage_studio/projects
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
                $ref: '#/components/schemas/GetProjectsResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
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
    GetProjectsResponseModel:
      type: object
      properties:
        projects:
          type: array
          items:
            $ref: '#/components/schemas/ProjectResponseModel'
          description: A list of projects with their metadata.
      required:
        - projects

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.studio.projects.list();
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.studio.projects.list()

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/studio/projects"

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

url = URI("https://api.elevenlabs.io/v1/studio/projects")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/studio/projects")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/studio/projects', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/studio/projects");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/studio/projects")! as URL,
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