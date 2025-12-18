# Get widget

GET https://api.elevenlabs.io/v1/convai/agents/{agent_id}/widget

Retrieve the widget configuration for an agent

Reference: https://elevenlabs.io/docs/api-reference/widget/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Agent Widget Config
  version: endpoint_conversationalAi/agents/widget.get
paths:
  /v1/convai/agents/{agent_id}/widget:
    get:
      operationId: get
      summary: Get Agent Widget Config
      description: Retrieve the widget configuration for an agent
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/agents
          - subpackage_conversationalAi/agents/widget
      parameters:
        - name: agent_id
          in: path
          description: The id of an agent. This is returned on agent creation.
          required: true
          schema:
            type: string
        - name: conversation_signature
          in: query
          description: >-
            An expiring token that enables a websocket conversation to start.
            These can be generated for an agent using the
            /v1/convai/conversation/get-signed-url endpoint
          required: false
          schema:
            type:
              - string
              - 'null'
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
                $ref: '#/components/schemas/GetAgentEmbedResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    EmbedVariant:
      type: string
      enum:
        - value: tiny
        - value: compact
        - value: full
        - value: expandable
    WidgetPlacement:
      type: string
      enum:
        - value: top-left
        - value: top
        - value: top-right
        - value: bottom-left
        - value: bottom
        - value: bottom-right
    WidgetExpandable:
      type: string
      enum:
        - value: never
        - value: mobile
        - value: desktop
        - value: always
    OrbAvatar:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: orb
          description: The type of the avatar
        color_1:
          type: string
          default: '#2792dc'
          description: The first color of the avatar
        color_2:
          type: string
          default: '#9ce6e6'
          description: The second color of the avatar
    URLAvatar:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: url
          description: The type of the avatar
        custom_url:
          type: string
          default: ''
          description: The custom URL of the avatar
    ImageAvatar:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: image
          description: The type of the avatar
        url:
          type: string
          default: ''
          description: The URL of the avatar
    WidgetConfigResponseModelAvatar:
      oneOf:
        - $ref: '#/components/schemas/OrbAvatar'
        - $ref: '#/components/schemas/URLAvatar'
        - $ref: '#/components/schemas/ImageAvatar'
    WidgetFeedbackMode:
      type: string
      enum:
        - value: none
        - value: during
        - value: end
    WidgetEndFeedbackType:
      type: string
      enum:
        - value: rating
    WidgetEndFeedbackConfig:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/WidgetEndFeedbackType'
          description: The type of feedback to collect at the end of the conversation
    WidgetTextContents:
      type: object
      properties:
        main_label:
          type:
            - string
            - 'null'
          description: Call to action displayed inside the compact and full variants.
        start_call:
          type:
            - string
            - 'null'
          description: Text and ARIA label for the start call button.
        start_chat:
          type:
            - string
            - 'null'
          description: Text and ARIA label for the start chat button (text only)
        new_call:
          type:
            - string
            - 'null'
          description: >-
            Text and ARIA label for the new call button. Displayed when the
            caller already finished at least one call in order ot start the next
            one.
        end_call:
          type:
            - string
            - 'null'
          description: Text and ARIA label for the end call button.
        mute_microphone:
          type:
            - string
            - 'null'
          description: ARIA label for the mute microphone button.
        change_language:
          type:
            - string
            - 'null'
          description: ARIA label for the change language dropdown.
        collapse:
          type:
            - string
            - 'null'
          description: ARIA label for the collapse button.
        expand:
          type:
            - string
            - 'null'
          description: ARIA label for the expand button.
        copied:
          type:
            - string
            - 'null'
          description: Text displayed when the user copies a value using the copy button.
        accept_terms:
          type:
            - string
            - 'null'
          description: Text and ARIA label for the accept terms button.
        dismiss_terms:
          type:
            - string
            - 'null'
          description: Text and ARIA label for the cancel terms button.
        listening_status:
          type:
            - string
            - 'null'
          description: Status displayed when the agent is listening.
        speaking_status:
          type:
            - string
            - 'null'
          description: Status displayed when the agent is speaking.
        connecting_status:
          type:
            - string
            - 'null'
          description: Status displayed when the agent is connecting.
        chatting_status:
          type:
            - string
            - 'null'
          description: Status displayed when the agent is chatting (text only)
        input_label:
          type:
            - string
            - 'null'
          description: ARIA label for the text message input.
        input_placeholder:
          type:
            - string
            - 'null'
          description: Placeholder text for the text message input.
        input_placeholder_text_only:
          type:
            - string
            - 'null'
          description: Placeholder text for the text message input (text only)
        input_placeholder_new_conversation:
          type:
            - string
            - 'null'
          description: >-
            Placeholder text for the text message input when starting a new
            conversation (text only)
        user_ended_conversation:
          type:
            - string
            - 'null'
          description: Information message displayed when the user ends the conversation.
        agent_ended_conversation:
          type:
            - string
            - 'null'
          description: Information message displayed when the agent ends the conversation.
        conversation_id:
          type:
            - string
            - 'null'
          description: Text label used next to the conversation ID.
        error_occurred:
          type:
            - string
            - 'null'
          description: Text label used when an error occurs.
        copy_id:
          type:
            - string
            - 'null'
          description: Text and ARIA label used for the copy ID button.
        initiate_feedback:
          type:
            - string
            - 'null'
          description: Text displayed to prompt the user for feedback.
        request_follow_up_feedback:
          type:
            - string
            - 'null'
          description: Text displayed to request additional feedback details.
        thanks_for_feedback:
          type:
            - string
            - 'null'
          description: Text displayed to thank the user for providing feedback.
        thanks_for_feedback_details:
          type:
            - string
            - 'null'
          description: Additional text displayed explaining the value of user feedback.
        follow_up_feedback_placeholder:
          type:
            - string
            - 'null'
          description: Placeholder text for the follow-up feedback input field.
        submit:
          type:
            - string
            - 'null'
          description: Text and ARIA label for the submit button.
        go_back:
          type:
            - string
            - 'null'
          description: Text and ARIA label for the go back button.
    WidgetStyles:
      type: object
      properties:
        base:
          type:
            - string
            - 'null'
          description: The base background color.
        base_hover:
          type:
            - string
            - 'null'
          description: The color of the base background when hovered.
        base_active:
          type:
            - string
            - 'null'
          description: The color of the base background when active (clicked).
        base_border:
          type:
            - string
            - 'null'
          description: The color of the border against the base background.
        base_subtle:
          type:
            - string
            - 'null'
          description: The color of subtle text against the base background.
        base_primary:
          type:
            - string
            - 'null'
          description: The color of primary text against the base background.
        base_error:
          type:
            - string
            - 'null'
          description: The color of error text against the base background.
        accent:
          type:
            - string
            - 'null'
          description: The accent background color.
        accent_hover:
          type:
            - string
            - 'null'
          description: The color of the accent background when hovered.
        accent_active:
          type:
            - string
            - 'null'
          description: The color of the accent background when active (clicked).
        accent_border:
          type:
            - string
            - 'null'
          description: The color of the border against the accent background.
        accent_subtle:
          type:
            - string
            - 'null'
          description: The color of subtle text against the accent background.
        accent_primary:
          type:
            - string
            - 'null'
          description: The color of primary text against the accent background.
        overlay_padding:
          type:
            - number
            - 'null'
          format: double
          description: The padding around the edges of the viewport.
        button_radius:
          type:
            - number
            - 'null'
          format: double
          description: The radius of the buttons.
        input_radius:
          type:
            - number
            - 'null'
          format: double
          description: The radius of the input fields.
        bubble_radius:
          type:
            - number
            - 'null'
          format: double
          description: The radius of the chat bubbles.
        sheet_radius:
          type:
            - number
            - 'null'
          format: double
          description: The default radius of sheets.
        compact_sheet_radius:
          type:
            - number
            - 'null'
          format: double
          description: The radius of the sheet in compact mode.
        dropdown_sheet_radius:
          type:
            - number
            - 'null'
          format: double
          description: The radius of the dropdown sheet.
    WidgetLanguagePresetResponse:
      type: object
      properties:
        first_message:
          type:
            - string
            - 'null'
        text_contents:
          oneOf:
            - $ref: '#/components/schemas/WidgetTextContents'
            - type: 'null'
          description: The text contents for the selected language
        terms_text:
          type:
            - string
            - 'null'
          description: The text to display for terms and conditions in this language
        terms_html:
          type:
            - string
            - 'null'
          description: The HTML to display for terms and conditions in this language
        terms_key:
          type:
            - string
            - 'null'
          description: The key to display for terms and conditions in this language
    WidgetConfigResponseModel:
      type: object
      properties:
        variant:
          $ref: '#/components/schemas/EmbedVariant'
          description: The variant of the widget
        placement:
          $ref: '#/components/schemas/WidgetPlacement'
          description: The placement of the widget on the screen
        expandable:
          $ref: '#/components/schemas/WidgetExpandable'
          description: Whether the widget is expandable
        avatar:
          $ref: '#/components/schemas/WidgetConfigResponseModelAvatar'
          description: The avatar of the widget
        feedback_mode:
          $ref: '#/components/schemas/WidgetFeedbackMode'
          description: The feedback mode of the widget
        end_feedback:
          oneOf:
            - $ref: '#/components/schemas/WidgetEndFeedbackConfig'
            - type: 'null'
          description: Configuration for feedback collected at the end of the conversation
        bg_color:
          type: string
          default: '#ffffff'
          description: The background color of the widget
        text_color:
          type: string
          default: '#000000'
          description: The text color of the widget
        btn_color:
          type: string
          default: '#000000'
          description: The button color of the widget
        btn_text_color:
          type: string
          default: '#ffffff'
          description: The button text color of the widget
        border_color:
          type: string
          default: '#e1e1e1'
          description: The border color of the widget
        focus_color:
          type: string
          default: '#000000'
          description: The focus color of the widget
        border_radius:
          type:
            - integer
            - 'null'
          description: The border radius of the widget
        btn_radius:
          type:
            - integer
            - 'null'
          description: The button radius of the widget
        action_text:
          type:
            - string
            - 'null'
          description: The action text of the widget
        start_call_text:
          type:
            - string
            - 'null'
          description: The start call text of the widget
        end_call_text:
          type:
            - string
            - 'null'
          description: The end call text of the widget
        expand_text:
          type:
            - string
            - 'null'
          description: The expand text of the widget
        listening_text:
          type:
            - string
            - 'null'
          description: The text to display when the agent is listening
        speaking_text:
          type:
            - string
            - 'null'
          description: The text to display when the agent is speaking
        shareable_page_text:
          type:
            - string
            - 'null'
          description: The text to display when sharing
        shareable_page_show_terms:
          type: boolean
          default: true
          description: Whether to show terms and conditions on the shareable page
        terms_text:
          type:
            - string
            - 'null'
          description: The text to display for terms and conditions
        terms_html:
          type:
            - string
            - 'null'
          description: The HTML to display for terms and conditions
        terms_key:
          type:
            - string
            - 'null'
          description: The key to display for terms and conditions
        show_avatar_when_collapsed:
          type:
            - boolean
            - 'null'
          default: false
          description: Whether to show the avatar when the widget is collapsed
        disable_banner:
          type: boolean
          default: false
          description: Whether to disable the banner
        override_link:
          type:
            - string
            - 'null'
          description: The override link for the widget
        mic_muting_enabled:
          type: boolean
          default: false
          description: Whether to enable mic muting
        transcript_enabled:
          type: boolean
          default: false
          description: >-
            Whether the widget should show the conversation transcript as it
            goes on
        text_input_enabled:
          type: boolean
          default: true
          description: Whether the user should be able to send text messages
        conversation_mode_toggle_enabled:
          type: boolean
          default: false
          description: Whether to enable the conversation mode toggle in the widget
        default_expanded:
          type: boolean
          default: false
          description: Whether the widget should be expanded by default
        always_expanded:
          type: boolean
          default: false
          description: Whether the widget should always be expanded
        text_contents:
          $ref: '#/components/schemas/WidgetTextContents'
          description: Text contents of the widget
        styles:
          $ref: '#/components/schemas/WidgetStyles'
          description: Styles for the widget
        language:
          type: string
        supported_language_overrides:
          type:
            - array
            - 'null'
          items:
            type: string
        language_presets:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/WidgetLanguagePresetResponse'
          description: Language presets for the widget
        text_only:
          type: boolean
          default: false
          description: Whether the agent uses text-only mode
        supports_text_only:
          type: boolean
          default: false
          description: Whether the agent can be switched to text-only mode
        first_message:
          type:
            - string
            - 'null'
        use_rtc:
          type:
            - boolean
            - 'null'
          description: Whether to use WebRTC for conversation connections
      required:
        - language
    GetAgentEmbedResponseModel:
      type: object
      properties:
        agent_id:
          type: string
        widget_config:
          $ref: '#/components/schemas/WidgetConfigResponseModel'
      required:
        - agent_id
        - widget_config

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.agents.widget.get("agent_id", {});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.agents.widget.get(
    agent_id="agent_id"
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

	url := "https://api.elevenlabs.io/v1/convai/agents/agent_id/widget"

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

url = URI("https://api.elevenlabs.io/v1/convai/agents/agent_id/widget")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/agents/agent_id/widget")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/agents/agent_id/widget', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/agents/agent_id/widget");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/agents/agent_id/widget")! as URL,
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