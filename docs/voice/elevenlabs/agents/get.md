# Get agent

GET https://api.elevenlabs.io/v1/convai/agents/{agent_id}

Retrieve config for an agent

Reference: https://elevenlabs.io/docs/api-reference/agents/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get agent
  version: endpoint_conversationalAi/agents.get
paths:
  /v1/convai/agents/{agent_id}:
    get:
      operationId: get
      summary: Get agent
      description: Retrieve config for an agent
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/agents
      parameters:
        - name: agent_id
          in: path
          description: The id of an agent. This is returned on agent creation.
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
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetAgentResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ASRQuality:
      type: string
      enum:
        - value: high
    ASRProvider:
      type: string
      enum:
        - value: elevenlabs
        - value: scribe_realtime
    ASRInputFormat:
      type: string
      enum:
        - value: pcm_8000
        - value: pcm_16000
        - value: pcm_22050
        - value: pcm_24000
        - value: pcm_44100
        - value: pcm_48000
        - value: ulaw_8000
    ASRConversationalConfig:
      type: object
      properties:
        quality:
          $ref: '#/components/schemas/ASRQuality'
          description: The quality of the transcription
        provider:
          $ref: '#/components/schemas/ASRProvider'
          description: The provider of the transcription service
        user_input_audio_format:
          $ref: '#/components/schemas/ASRInputFormat'
          description: The format of the audio to be transcribed
        keywords:
          type: array
          items:
            type: string
          description: Keywords to boost prediction probability for
    SoftTimeoutConfig:
      type: object
      properties:
        timeout_seconds:
          type: number
          format: double
          default: -1
          description: >-
            Time in seconds before showing the predefined message while waiting
            for LLM response. Set to -1 to disable.
        message:
          type: string
          default: Hhmmmm...yeah give me a second...
          description: >-
            Message to show when soft timeout is reached while waiting for LLM
            response
    TurnEagerness:
      type: string
      enum:
        - value: patient
        - value: normal
        - value: eager
    TurnConfig:
      type: object
      properties:
        turn_timeout:
          type: number
          format: double
          default: 7
          description: Maximum wait time for the user's reply before re-engaging the user
        initial_wait_time:
          type:
            - number
            - 'null'
          format: double
          description: >-
            How long the agent will wait for the user to start the conversation
            if the first message is empty. If not set, uses the regular
            turn_timeout.
        silence_end_call_timeout:
          type: number
          format: double
          default: -1
          description: >-
            Maximum wait time since the user last spoke before terminating the
            call
        soft_timeout_config:
          $ref: '#/components/schemas/SoftTimeoutConfig'
          description: >-
            Configuration for soft timeout functionality. Provides immediate
            feedback during longer LLM responses.
        turn_eagerness:
          $ref: '#/components/schemas/TurnEagerness'
          description: >-
            Controls how eager the agent is to respond. Low = less eager (waits
            longer), Standard = default eagerness, High = more eager (responds
            sooner)
    TTSConversationalModel:
      type: string
      enum:
        - value: eleven_turbo_v2
        - value: eleven_turbo_v2_5
        - value: eleven_flash_v2
        - value: eleven_flash_v2_5
        - value: eleven_multilingual_v2
    TTSModelFamily:
      type: string
      enum:
        - value: turbo
        - value: flash
        - value: multilingual
    TTSOptimizeStreamingLatency:
      type: string
      enum:
        - value: '0'
        - value: '1'
        - value: '2'
        - value: '3'
        - value: '4'
    SupportedVoice:
      type: object
      properties:
        label:
          type: string
        voice_id:
          type: string
        description:
          type:
            - string
            - 'null'
        language:
          type:
            - string
            - 'null'
        model_family:
          oneOf:
            - $ref: '#/components/schemas/TTSModelFamily'
            - type: 'null'
        optimize_streaming_latency:
          oneOf:
            - $ref: '#/components/schemas/TTSOptimizeStreamingLatency'
            - type: 'null'
        stability:
          type:
            - number
            - 'null'
          format: double
        speed:
          type:
            - number
            - 'null'
          format: double
        similarity_boost:
          type:
            - number
            - 'null'
          format: double
      required:
        - label
        - voice_id
    TTSOutputFormat:
      type: string
      enum:
        - value: pcm_8000
        - value: pcm_16000
        - value: pcm_22050
        - value: pcm_24000
        - value: pcm_44100
        - value: pcm_48000
        - value: ulaw_8000
    TextNormalisationType:
      type: string
      enum:
        - value: system_prompt
        - value: elevenlabs
    PydanticPronunciationDictionaryVersionLocator:
      type: object
      properties:
        pronunciation_dictionary_id:
          type: string
          description: The ID of the pronunciation dictionary
        version_id:
          type:
            - string
            - 'null'
          description: The ID of the version of the pronunciation dictionary
      required:
        - pronunciation_dictionary_id
        - version_id
    TTSConversationalConfig-Output:
      type: object
      properties:
        model_id:
          $ref: '#/components/schemas/TTSConversationalModel'
          description: The model to use for TTS
        voice_id:
          type: string
          default: cjVigY5qzO86Huf0OWal
          description: The voice ID to use for TTS
        supported_voices:
          type: array
          items:
            $ref: '#/components/schemas/SupportedVoice'
          description: Additional supported voices for the agent
        agent_output_audio_format:
          $ref: '#/components/schemas/TTSOutputFormat'
          description: The audio format to use for TTS
        optimize_streaming_latency:
          $ref: '#/components/schemas/TTSOptimizeStreamingLatency'
          description: The optimization for streaming latency
        stability:
          type: number
          format: double
          default: 0.5
          description: The stability of generated speech
        speed:
          type: number
          format: double
          default: 1
          description: The speed of generated speech
        similarity_boost:
          type: number
          format: double
          default: 0.8
          description: The similarity boost for generated speech
        text_normalisation_type:
          $ref: '#/components/schemas/TextNormalisationType'
          description: >-
            Method for converting numbers to words before converting text to
            speech. If set to SYSTEM_PROMPT, the system prompt will be updated
            to include normalization instructions. If set to ELEVENLABS, the
            text will be normalized after generation, incurring slight
            additional latency.
        pronunciation_dictionary_locators:
          type: array
          items:
            $ref: '#/components/schemas/PydanticPronunciationDictionaryVersionLocator'
          description: The pronunciation dictionary locators
    ClientEvent:
      type: string
      enum:
        - value: conversation_initiation_metadata
        - value: asr_initiation_metadata
        - value: ping
        - value: audio
        - value: interruption
        - value: user_transcript
        - value: tentative_user_transcript
        - value: agent_response
        - value: agent_response_correction
        - value: client_tool_call
        - value: mcp_tool_call
        - value: mcp_connection_status
        - value: agent_tool_request
        - value: agent_tool_response
        - value: agent_response_metadata
        - value: vad_score
        - value: agent_chat_response_part
        - value: internal_turn_probability
        - value: internal_tentative_agent_response
    ConversationConfig:
      type: object
      properties:
        text_only:
          type: boolean
          default: false
          description: >-
            If enabled audio will not be processed and only text will be used,
            use to avoid audio pricing.
        max_duration_seconds:
          type: integer
          default: 600
          description: The maximum duration of a conversation in seconds
        client_events:
          type: array
          items:
            $ref: '#/components/schemas/ClientEvent'
          description: The events that will be sent to the client
        monitoring_enabled:
          type: boolean
          default: false
          description: Enable real-time monitoring of conversations via WebSocket
        monitoring_events:
          type: array
          items:
            $ref: '#/components/schemas/ClientEvent'
          description: The events that will be sent to monitoring connections.
    SoftTimeoutConfigOverride:
      type: object
      properties:
        message:
          type:
            - string
            - 'null'
          description: >-
            Message to show when soft timeout is reached while waiting for LLM
            response
    TurnConfigOverride:
      type: object
      properties:
        soft_timeout_config:
          oneOf:
            - $ref: '#/components/schemas/SoftTimeoutConfigOverride'
            - type: 'null'
          description: >-
            Configuration for soft timeout functionality. Provides immediate
            feedback during longer LLM responses.
    TTSConversationalConfigOverride:
      type: object
      properties:
        voice_id:
          type:
            - string
            - 'null'
          description: The voice ID to use for TTS
        stability:
          type:
            - number
            - 'null'
          format: double
          description: The stability of generated speech
        speed:
          type:
            - number
            - 'null'
          format: double
          description: The speed of generated speech
        similarity_boost:
          type:
            - number
            - 'null'
          format: double
          description: The similarity boost for generated speech
    ConversationConfigOverride:
      type: object
      properties:
        text_only:
          type:
            - boolean
            - 'null'
          description: >-
            If enabled audio will not be processed and only text will be used,
            use to avoid audio pricing.
    LLM:
      type: string
      enum:
        - value: gpt-4o-mini
        - value: gpt-4o
        - value: gpt-4
        - value: gpt-4-turbo
        - value: gpt-4.1
        - value: gpt-4.1-mini
        - value: gpt-4.1-nano
        - value: gpt-5
        - value: gpt-5.1
        - value: gpt-5.2
        - value: gpt-5.2-chat-latest
        - value: gpt-5-mini
        - value: gpt-5-nano
        - value: gpt-3.5-turbo
        - value: gemini-1.5-pro
        - value: gemini-1.5-flash
        - value: gemini-2.0-flash
        - value: gemini-2.0-flash-lite
        - value: gemini-2.5-flash-lite
        - value: gemini-2.5-flash
        - value: gemini-3-pro-preview
        - value: claude-sonnet-4-5
        - value: claude-sonnet-4
        - value: claude-haiku-4-5
        - value: claude-3-7-sonnet
        - value: claude-3-5-sonnet
        - value: claude-3-5-sonnet-v1
        - value: claude-3-haiku
        - value: grok-beta
        - value: custom-llm
        - value: qwen3-4b
        - value: qwen3-30b-a3b
        - value: gpt-oss-20b
        - value: gpt-oss-120b
        - value: glm-45-air-fp8
        - value: gemini-2.5-flash-preview-09-2025
        - value: gemini-2.5-flash-lite-preview-09-2025
        - value: gemini-2.5-flash-preview-05-20
        - value: gemini-2.5-flash-preview-04-17
        - value: gemini-2.5-flash-lite-preview-06-17
        - value: gemini-2.0-flash-lite-001
        - value: gemini-2.0-flash-001
        - value: gemini-1.5-flash-002
        - value: gemini-1.5-flash-001
        - value: gemini-1.5-pro-002
        - value: gemini-1.5-pro-001
        - value: claude-sonnet-4@20250514
        - value: claude-sonnet-4-5@20250929
        - value: claude-haiku-4-5@20251001
        - value: claude-3-7-sonnet@20250219
        - value: claude-3-5-sonnet@20240620
        - value: claude-3-5-sonnet-v2@20241022
        - value: claude-3-haiku@20240307
        - value: gpt-5-2025-08-07
        - value: gpt-5.1-2025-11-13
        - value: gpt-5.2-2025-12-11
        - value: gpt-5-mini-2025-08-07
        - value: gpt-5-nano-2025-08-07
        - value: gpt-4.1-2025-04-14
        - value: gpt-4.1-mini-2025-04-14
        - value: gpt-4.1-nano-2025-04-14
        - value: gpt-4o-mini-2024-07-18
        - value: gpt-4o-2024-11-20
        - value: gpt-4o-2024-08-06
        - value: gpt-4o-2024-05-13
        - value: gpt-4-0613
        - value: gpt-4-0314
        - value: gpt-4-turbo-2024-04-09
        - value: gpt-3.5-turbo-0125
        - value: gpt-3.5-turbo-1106
        - value: watt-tool-8b
        - value: watt-tool-70b
    PromptAgentAPIModelOverride:
      type: object
      properties:
        prompt:
          type:
            - string
            - 'null'
          description: The prompt for the agent
        llm:
          oneOf:
            - $ref: '#/components/schemas/LLM'
            - type: 'null'
          description: >-
            The LLM to query with the prompt and the chat history. If using data
            residency, the LLM must be supported in the data residency
            environment
        native_mcp_server_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of Native MCP server ids to be used by the agent
    AgentConfigOverride-Output:
      type: object
      properties:
        first_message:
          type:
            - string
            - 'null'
          description: >-
            If non-empty, the first message the agent will say. If empty, the
            agent waits for the user to start the discussion.
        language:
          type:
            - string
            - 'null'
          description: Language of the agent - used for ASR and TTS
        prompt:
          oneOf:
            - $ref: '#/components/schemas/PromptAgentAPIModelOverride'
            - type: 'null'
          description: The prompt for the agent
    ConversationConfigClientOverride-Output:
      type: object
      properties:
        turn:
          oneOf:
            - $ref: '#/components/schemas/TurnConfigOverride'
            - type: 'null'
          description: Configuration for turn detection
        tts:
          oneOf:
            - $ref: '#/components/schemas/TTSConversationalConfigOverride'
            - type: 'null'
          description: Configuration for conversational text to speech
        conversation:
          oneOf:
            - $ref: '#/components/schemas/ConversationConfigOverride'
            - type: 'null'
          description: Configuration for conversational events
        agent:
          oneOf:
            - $ref: '#/components/schemas/AgentConfigOverride-Output'
            - type: 'null'
          description: Agent specific configuration
    LanguagePresetTranslation:
      type: object
      properties:
        source_hash:
          type: string
        text:
          type: string
      required:
        - source_hash
        - text
    LanguagePreset-Output:
      type: object
      properties:
        overrides:
          $ref: '#/components/schemas/ConversationConfigClientOverride-Output'
          description: The overrides for the language preset
        first_message_translation:
          oneOf:
            - $ref: '#/components/schemas/LanguagePresetTranslation'
            - type: 'null'
          description: The translation of the first message
        soft_timeout_translation:
          oneOf:
            - $ref: '#/components/schemas/LanguagePresetTranslation'
            - type: 'null'
          description: The translation of the soft timeout message
      required:
        - overrides
    VADConfig:
      type: object
      properties: {}
    DynamicVariablesConfigDynamicVariablePlaceholders:
      oneOf:
        - type: string
        - type: number
          format: double
        - type: integer
        - type: boolean
    DynamicVariablesConfig:
      type: object
      properties:
        dynamic_variable_placeholders:
          type: object
          additionalProperties:
            $ref: >-
              #/components/schemas/DynamicVariablesConfigDynamicVariablePlaceholders
          description: A dictionary of dynamic variable placeholders and their values
    LLMReasoningEffort:
      type: string
      enum:
        - value: none
        - value: minimal
        - value: low
        - value: medium
        - value: high
    DynamicVariableAssignment:
      type: object
      properties:
        source:
          type: string
          enum:
            - type: stringLiteral
              value: response
          description: >-
            The source to extract the value from. Currently only 'response' is
            supported.
        dynamic_variable:
          type: string
          description: The name of the dynamic variable to assign the extracted value to
        value_path:
          type: string
          description: >-
            Dot notation path to extract the value from the source (e.g.,
            'user.name' or 'data.0.id')
      required:
        - dynamic_variable
        - value_path
    ToolCallSoundType:
      type: string
      enum:
        - value: typing
        - value: elevator1
        - value: elevator2
        - value: elevator3
        - value: elevator4
    ToolCallSoundBehavior:
      type: string
      enum:
        - value: auto
        - value: always
    EndCallToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: end_call
    LanguageDetectionToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: language_detection
    AgentTransfer:
      type: object
      properties:
        agent_id:
          type: string
        condition:
          type: string
        delay_ms:
          type: integer
          default: 0
        transfer_message:
          type:
            - string
            - 'null'
        enable_transferred_agent_first_message:
          type: boolean
          default: false
      required:
        - agent_id
        - condition
    TransferToAgentToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_agent
        transfers:
          type: array
          items:
            $ref: '#/components/schemas/AgentTransfer'
      required:
        - transfers
    PhoneNumberTransferDestination:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: phone
        phone_number:
          type: string
      required:
        - phone_number
    SIPUriTransferDestination:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: sip_uri
        sip_uri:
          type: string
      required:
        - sip_uri
    PhoneNumberDynamicVariableTransferDestination:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: phone_dynamic_variable
        phone_number:
          type: string
      required:
        - phone_number
    SIPUriDynamicVariableTransferDestination:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: sip_uri_dynamic_variable
        sip_uri:
          type: string
      required:
        - sip_uri
    PhoneNumberTransferTransferDestination:
      oneOf:
        - $ref: '#/components/schemas/PhoneNumberTransferDestination'
        - $ref: '#/components/schemas/SIPUriTransferDestination'
        - $ref: '#/components/schemas/PhoneNumberDynamicVariableTransferDestination'
        - $ref: '#/components/schemas/SIPUriDynamicVariableTransferDestination'
    TransferTypeEnum:
      type: string
      enum:
        - value: conference
        - value: sip_refer
    PhoneNumberTransfer:
      type: object
      properties:
        transfer_destination:
          oneOf:
            - $ref: '#/components/schemas/PhoneNumberTransferTransferDestination'
            - type: 'null'
        phone_number:
          type:
            - string
            - 'null'
        condition:
          type: string
        transfer_type:
          $ref: '#/components/schemas/TransferTypeEnum'
      required:
        - condition
    TransferToNumberToolConfig-Output:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number
        transfers:
          type: array
          items:
            $ref: '#/components/schemas/PhoneNumberTransfer'
        enable_client_message:
          type: boolean
          default: true
          description: >-
            Whether to play a message to the client while they wait for
            transfer. Defaults to true for backward compatibility.
      required:
        - transfers
    SkipTurnToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: skip_turn
    PlayDTMFToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: play_keypad_touch_tone
        use_out_of_band_dtmf:
          type: boolean
          default: false
          description: >-
            If true, send DTMF tones out-of-band using RFC 4733 (useful for SIP
            calls only). If false, send DTMF as in-band audio tones (default,
            works for all call types).
    VoicemailDetectionToolConfig:
      type: object
      properties:
        system_tool_type:
          type: string
          enum:
            - type: stringLiteral
              value: voicemail_detection
        voicemail_message:
          type:
            - string
            - 'null'
          description: >-
            Optional message to leave on voicemail when detected. If not
            provided, the call will end immediately when voicemail is detected.
            Supports dynamic variables (e.g., {{system__time}},
            {{system__call_duration_secs}}, {{custom_variable}}).
    SystemToolConfigOutputParams:
      oneOf:
        - $ref: '#/components/schemas/EndCallToolConfig'
        - $ref: '#/components/schemas/LanguageDetectionToolConfig'
        - $ref: '#/components/schemas/TransferToAgentToolConfig'
        - $ref: '#/components/schemas/TransferToNumberToolConfig-Output'
        - $ref: '#/components/schemas/SkipTurnToolConfig'
        - $ref: '#/components/schemas/PlayDTMFToolConfig'
        - $ref: '#/components/schemas/VoicemailDetectionToolConfig'
    SystemToolConfig-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: system
          description: The type of tool
        name:
          type: string
        description:
          type: string
          default: ''
          description: >-
            Description of when the tool should be used and what it does. Leave
            empty to use the default description that's optimized for the
            specific tool type.
        response_timeout_secs:
          type: integer
          default: 20
          description: The maximum time in seconds to wait for the tool call to complete.
        disable_interruptions:
          type: boolean
          default: false
          description: >-
            If true, the user will not be able to interrupt the agent while this
            tool is running.
        force_pre_tool_speech:
          type: boolean
          default: false
          description: If true, the agent will speak before the tool call.
        assignments:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableAssignment'
          description: >-
            Configuration for extracting values from tool responses and
            assigning them to dynamic variables
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: >-
            Predefined tool call sound type to play during tool execution. If
            not specified, no tool call sound will be played.
        tool_call_sound_behavior:
          $ref: '#/components/schemas/ToolCallSoundBehavior'
          description: >-
            Determines when the tool call sound should play. 'auto' only plays
            when there's pre-tool speech, 'always' plays for every tool call.
        params:
          $ref: '#/components/schemas/SystemToolConfigOutputParams'
      required:
        - name
        - params
    BuiltInTools-Output:
      type: object
      properties:
        end_call:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The end call tool
        language_detection:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The language detection tool
        transfer_to_agent:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The transfer to agent tool
        transfer_to_number:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The transfer to number tool
        skip_turn:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The skip turn tool
        play_keypad_touch_tone:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The play DTMF tool
        voicemail_detection:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The voicemail detection tool
    KnowledgeBaseDocumentType:
      type: string
      enum:
        - value: file
        - value: url
        - value: text
        - value: folder
    DocumentUsageModeEnum:
      type: string
      enum:
        - value: prompt
        - value: auto
    KnowledgeBaseLocator:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/KnowledgeBaseDocumentType'
          description: The type of the knowledge base
        name:
          type: string
          description: The name of the knowledge base
        id:
          type: string
          description: The ID of the knowledge base
        usage_mode:
          $ref: '#/components/schemas/DocumentUsageModeEnum'
          description: The usage mode of the knowledge base
      required:
        - type
        - name
        - id
    ConvAISecretLocator:
      type: object
      properties:
        secret_id:
          type: string
      required:
        - secret_id
    ConvAIDynamicVariable:
      type: object
      properties:
        variable_name:
          type: string
      required:
        - variable_name
    CustomLlmRequestHeaders:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAISecretLocator'
        - $ref: '#/components/schemas/ConvAIDynamicVariable'
    CustomLLMAPIType:
      type: string
      enum:
        - value: chat_completions
        - value: responses
    CustomLLM:
      type: object
      properties:
        url:
          type: string
          description: The URL of the Chat Completions compatible endpoint
        model_id:
          type:
            - string
            - 'null'
          description: The model ID to be used if URL serves multiple models
        api_key:
          oneOf:
            - $ref: '#/components/schemas/ConvAISecretLocator'
            - type: 'null'
          description: The API key for authentication
        request_headers:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/CustomLlmRequestHeaders'
          description: Headers that should be included in the request
        api_version:
          type:
            - string
            - 'null'
          description: The API version to use for the request
        api_type:
          $ref: '#/components/schemas/CustomLLMAPIType'
          description: The API type to use (chat_completions or responses)
      required:
        - url
    EmbeddingModelEnum:
      type: string
      enum:
        - value: e5_mistral_7b_instruct
        - value: multilingual_e5_large_instruct
    RagConfig:
      type: object
      properties:
        enabled:
          type: boolean
          default: false
        embedding_model:
          $ref: '#/components/schemas/EmbeddingModelEnum'
        max_vector_distance:
          type: number
          format: double
          default: 0.6
          description: Maximum vector distance of retrieved chunks.
        max_documents_length:
          type: integer
          default: 50000
          description: Maximum total length of document chunks retrieved from RAG.
        max_retrieved_rag_chunks_count:
          type: integer
          default: 20
          description: >-
            Maximum number of RAG document chunks to initially retrieve from the
            vector store. These are then further filtered by vector distance and
            total length.
        query_rewrite_prompt_override:
          type:
            - string
            - 'null'
          description: >-
            Custom prompt for rewriting user queries before RAG retrieval. The
            conversation history will be automatically appended at the end. If
            not set, the default prompt will be used.
    BackupLLMDefault:
      type: object
      properties:
        preference:
          type: string
          enum:
            - type: stringLiteral
              value: default
    BackupLLMDisabled:
      type: object
      properties:
        preference:
          type: string
          enum:
            - type: stringLiteral
              value: disabled
    BackupLLMOverride:
      type: object
      properties:
        preference:
          type: string
          enum:
            - type: stringLiteral
              value: override
        order:
          type: array
          items:
            $ref: '#/components/schemas/LLM'
      required:
        - order
    PromptAgentApiModelOutputBackupLlmConfig:
      oneOf:
        - $ref: '#/components/schemas/BackupLLMDefault'
        - $ref: '#/components/schemas/BackupLLMDisabled'
        - $ref: '#/components/schemas/BackupLLMOverride'
    ToolExecutionMode:
      type: string
      enum:
        - value: immediate
        - value: post_tool_speech
        - value: async
    WebhookToolApiSchemaConfigOutputRequestHeaders:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAISecretLocator'
        - $ref: '#/components/schemas/ConvAIDynamicVariable'
    WebhookToolApiSchemaConfigOutputMethod:
      type: string
      enum:
        - value: GET
        - value: POST
        - value: PUT
        - value: PATCH
        - value: DELETE
      default: GET
    LiteralJsonSchemaPropertyType:
      type: string
      enum:
        - value: boolean
        - value: string
        - value: integer
        - value: number
    LiteralJsonSchemaPropertyConstantValue:
      oneOf:
        - type: string
        - type: integer
        - type: number
          format: double
        - type: boolean
    LiteralJsonSchemaProperty:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/LiteralJsonSchemaPropertyType'
        description:
          type: string
          default: ''
          description: The description of the property
        enum:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of allowed string values for string type parameters
        is_system_provided:
          type: boolean
          default: false
          description: >-
            If true, the value will be populated by the system at runtime. Used
            by Api Integration Webhook tools for templating.
        dynamic_variable:
          type: string
          default: ''
          description: The dynamic variable of the property
        constant_value:
          $ref: '#/components/schemas/LiteralJsonSchemaPropertyConstantValue'
          description: The constant value of the property
      required:
        - type
    QueryParamsJsonSchema:
      type: object
      properties:
        properties:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LiteralJsonSchemaProperty'
        required:
          type: array
          items:
            type: string
      required:
        - properties
    ArrayJsonSchemaPropertyOutputItems:
      oneOf:
        - $ref: '#/components/schemas/LiteralJsonSchemaProperty'
        - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Output'
        - $ref: '#/components/schemas/ArrayJsonSchemaProperty-Output'
    ArrayJsonSchemaProperty-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: array
        description:
          type: string
          default: ''
        items:
          $ref: '#/components/schemas/ArrayJsonSchemaPropertyOutputItems'
      required:
        - items
    ObjectJsonSchemaPropertyOutput:
      oneOf:
        - $ref: '#/components/schemas/LiteralJsonSchemaProperty'
        - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Output'
        - $ref: '#/components/schemas/ArrayJsonSchemaProperty-Output'
    ObjectJsonSchemaProperty-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: object
        required:
          type: array
          items:
            type: string
        description:
          type: string
          default: ''
        properties:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/ObjectJsonSchemaPropertyOutput'
    WebhookToolApiSchemaConfigOutputContentType:
      type: string
      enum:
        - value: application/json
        - value: application/x-www-form-urlencoded
      default: application/json
    AuthConnectionLocator:
      type: object
      properties:
        auth_connection_id:
          type: string
      required:
        - auth_connection_id
    WebhookToolApiSchemaConfig-Output:
      type: object
      properties:
        request_headers:
          type: object
          additionalProperties:
            $ref: >-
              #/components/schemas/WebhookToolApiSchemaConfigOutputRequestHeaders
          description: Headers that should be included in the request
        url:
          type: string
          description: >-
            The URL that the webhook will be sent to. May include path
            parameters, e.g. https://example.com/agents/{agent_id}
        method:
          $ref: '#/components/schemas/WebhookToolApiSchemaConfigOutputMethod'
          description: The HTTP method to use for the webhook
        path_params_schema:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LiteralJsonSchemaProperty'
          description: >-
            Schema for path parameters, if any. The keys should match the
            placeholders in the URL.
        query_params_schema:
          oneOf:
            - $ref: '#/components/schemas/QueryParamsJsonSchema'
            - type: 'null'
          description: >-
            Schema for any query params, if any. These will be added to end of
            the URL as query params. Note: properties in a query param must all
            be literal types
        request_body_schema:
          oneOf:
            - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Output'
            - type: 'null'
          description: >-
            Schema for the body parameters, if any. Used for POST/PATCH/PUT
            requests. The schema should be an object which will be sent as the
            json body
        content_type:
          $ref: '#/components/schemas/WebhookToolApiSchemaConfigOutputContentType'
          description: >-
            Content type for the request body. Only applies to POST/PUT/PATCH
            requests.
        auth_connection:
          oneOf:
            - $ref: '#/components/schemas/AuthConnectionLocator'
            - type: 'null'
          description: Optional auth connection to use for authentication with this webhook
      required:
        - url
    WebhookToolConfig-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: webhook
          description: The type of tool
        name:
          type: string
        description:
          type: string
          description: Description of when the tool should be used and what it does.
        response_timeout_secs:
          type: integer
          default: 20
          description: >-
            The maximum time in seconds to wait for the tool call to complete.
            Must be between 5 and 120 seconds (inclusive).
        disable_interruptions:
          type: boolean
          default: false
          description: >-
            If true, the user will not be able to interrupt the agent while this
            tool is running.
        force_pre_tool_speech:
          type: boolean
          default: false
          description: If true, the agent will speak before the tool call.
        assignments:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableAssignment'
          description: >-
            Configuration for extracting values from tool responses and
            assigning them to dynamic variables
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: >-
            Predefined tool call sound type to play during tool execution. If
            not specified, no tool call sound will be played.
        tool_call_sound_behavior:
          $ref: '#/components/schemas/ToolCallSoundBehavior'
          description: >-
            Determines when the tool call sound should play. 'auto' only plays
            when there's pre-tool speech, 'always' plays for every tool call.
        dynamic_variables:
          $ref: '#/components/schemas/DynamicVariablesConfig'
          description: Configuration for dynamic variables
        execution_mode:
          $ref: '#/components/schemas/ToolExecutionMode'
          description: >-
            Determines when and how the tool executes: 'immediate' executes the
            tool right away when requested by the LLM, 'post_tool_speech' waits
            for the agent to finish speaking before executing, 'async' runs the
            tool in the background without blocking - best for long-running
            operations.
        api_schema:
          $ref: '#/components/schemas/WebhookToolApiSchemaConfig-Output'
          description: >-
            The schema for the outgoing webhoook, including parameters and URL
            specification
      required:
        - name
        - description
        - api_schema
    ClientToolConfig-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: client
          description: The type of tool
        name:
          type: string
        description:
          type: string
          description: Description of when the tool should be used and what it does.
        response_timeout_secs:
          type: integer
          default: 20
          description: >-
            The maximum time in seconds to wait for the tool call to complete.
            Must be between 1 and 120 seconds (inclusive).
        disable_interruptions:
          type: boolean
          default: false
          description: >-
            If true, the user will not be able to interrupt the agent while this
            tool is running.
        force_pre_tool_speech:
          type: boolean
          default: false
          description: If true, the agent will speak before the tool call.
        assignments:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableAssignment'
          description: >-
            Configuration for extracting values from tool responses and
            assigning them to dynamic variables
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: >-
            Predefined tool call sound type to play during tool execution. If
            not specified, no tool call sound will be played.
        tool_call_sound_behavior:
          $ref: '#/components/schemas/ToolCallSoundBehavior'
          description: >-
            Determines when the tool call sound should play. 'auto' only plays
            when there's pre-tool speech, 'always' plays for every tool call.
        parameters:
          oneOf:
            - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Output'
            - type: 'null'
          description: Schema for any parameters to pass to the client
        expects_response:
          type: boolean
          default: false
          description: >-
            If true, calling this tool should block the conversation until the
            client responds with some response which is passed to the llm. If
            false then we will continue the conversation without waiting for the
            client to respond, this is useful to show content to a user but not
            block the conversation
        dynamic_variables:
          $ref: '#/components/schemas/DynamicVariablesConfig'
          description: Configuration for dynamic variables
        execution_mode:
          $ref: '#/components/schemas/ToolExecutionMode'
          description: >-
            Determines when and how the tool executes: 'immediate' executes the
            tool right away when requested by the LLM, 'post_tool_speech' waits
            for the agent to finish speaking before executing, 'async' runs the
            tool in the background without blocking - best for long-running
            operations.
      required:
        - name
        - description
    LiteralOverrideConstantValue:
      oneOf:
        - type: string
        - type: integer
        - type: number
          format: double
        - type: boolean
    LiteralOverride:
      type: object
      properties:
        description:
          type:
            - string
            - 'null'
        dynamic_variable:
          type:
            - string
            - 'null'
        constant_value:
          oneOf:
            - $ref: '#/components/schemas/LiteralOverrideConstantValue'
            - type: 'null'
    QueryOverride:
      type: object
      properties:
        properties:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: '#/components/schemas/LiteralOverride'
        required:
          type:
            - array
            - 'null'
          items:
            type: string
    ObjectOverrideOutput:
      oneOf:
        - $ref: '#/components/schemas/LiteralOverride'
        - $ref: '#/components/schemas/ObjectOverride-Output'
    ObjectOverride-Output:
      type: object
      properties:
        description:
          type:
            - string
            - 'null'
        properties:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: '#/components/schemas/ObjectOverrideOutput'
        required:
          type:
            - array
            - 'null'
          items:
            type: string
    ApiIntegrationWebhookOverridesOutputRequestHeaders:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAIDynamicVariable'
    ApiIntegrationWebhookOverrides-Output:
      type: object
      properties:
        path_params_schema:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: '#/components/schemas/LiteralOverride'
        query_params_schema:
          oneOf:
            - $ref: '#/components/schemas/QueryOverride'
            - type: 'null'
        request_body_schema:
          oneOf:
            - $ref: '#/components/schemas/ObjectOverride-Output'
            - type: 'null'
        request_headers:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: >-
              #/components/schemas/ApiIntegrationWebhookOverridesOutputRequestHeaders
    ApiIntegrationWebhookToolConfig-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: api_integration_webhook
        name:
          type: string
        description:
          type: string
          description: Description of when the tool should be used and what it does.
        response_timeout_secs:
          type: integer
          default: 20
          description: >-
            The maximum time in seconds to wait for the tool call to complete.
            Must be between 5 and 120 seconds (inclusive).
        disable_interruptions:
          type: boolean
          default: false
          description: >-
            If true, the user will not be able to interrupt the agent while this
            tool is running.
        force_pre_tool_speech:
          type: boolean
          default: false
          description: If true, the agent will speak before the tool call.
        assignments:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableAssignment'
          description: >-
            Configuration for extracting values from tool responses and
            assigning them to dynamic variables
        tool_call_sound:
          oneOf:
            - $ref: '#/components/schemas/ToolCallSoundType'
            - type: 'null'
          description: >-
            Predefined tool call sound type to play during tool execution. If
            not specified, no tool call sound will be played.
        tool_call_sound_behavior:
          $ref: '#/components/schemas/ToolCallSoundBehavior'
          description: >-
            Determines when the tool call sound should play. 'auto' only plays
            when there's pre-tool speech, 'always' plays for every tool call.
        dynamic_variables:
          $ref: '#/components/schemas/DynamicVariablesConfig'
          description: Configuration for dynamic variables
        execution_mode:
          $ref: '#/components/schemas/ToolExecutionMode'
          description: >-
            Determines when and how the tool executes: 'immediate' executes the
            tool right away when requested by the LLM, 'post_tool_speech' waits
            for the agent to finish speaking before executing, 'async' runs the
            tool in the background without blocking - best for long-running
            operations.
        tool_version:
          type: string
          default: 1.0.0
          description: The version of the API integration tool
        api_integration_id:
          type: string
        api_integration_connection_id:
          type: string
        api_schema_overrides:
          oneOf:
            - $ref: '#/components/schemas/ApiIntegrationWebhookOverrides-Output'
            - type: 'null'
          description: User overrides applied on top of the base api_schema
      required:
        - type
        - name
        - description
        - response_timeout_secs
        - disable_interruptions
        - force_pre_tool_speech
        - assignments
        - tool_call_sound
        - tool_call_sound_behavior
        - dynamic_variables
        - execution_mode
        - tool_version
        - api_integration_id
        - api_integration_connection_id
        - api_schema_overrides
    PromptAgentApiModelOutputToolsItems:
      oneOf:
        - $ref: '#/components/schemas/WebhookToolConfig-Output'
        - $ref: '#/components/schemas/ClientToolConfig-Output'
        - $ref: '#/components/schemas/SystemToolConfig-Output'
        - $ref: '#/components/schemas/ApiIntegrationWebhookToolConfig-Output'
    PromptAgentAPIModel-Output:
      type: object
      properties:
        prompt:
          type: string
          default: ''
          description: The prompt for the agent
        llm:
          $ref: '#/components/schemas/LLM'
          description: >-
            The LLM to query with the prompt and the chat history. If using data
            residency, the LLM must be supported in the data residency
            environment
        reasoning_effort:
          oneOf:
            - $ref: '#/components/schemas/LLMReasoningEffort'
            - type: 'null'
          description: Reasoning effort of the model. Only available for some models.
        thinking_budget:
          type:
            - integer
            - 'null'
          description: >-
            Max number of tokens used for thinking. Use 0 to turn off if
            supported by the model.
        temperature:
          type: number
          format: double
          default: 0
          description: The temperature for the LLM
        max_tokens:
          type: integer
          default: -1
          description: If greater than 0, maximum number of tokens the LLM can predict
        tool_ids:
          type: array
          items:
            type: string
          description: A list of IDs of tools used by the agent
        built_in_tools:
          $ref: '#/components/schemas/BuiltInTools-Output'
          description: Built-in system tools to be used by the agent
        mcp_server_ids:
          type: array
          items:
            type: string
          description: A list of MCP server ids to be used by the agent
        native_mcp_server_ids:
          type: array
          items:
            type: string
          description: A list of Native MCP server ids to be used by the agent
        knowledge_base:
          type: array
          items:
            $ref: '#/components/schemas/KnowledgeBaseLocator'
          description: A list of knowledge bases to be used by the agent
        custom_llm:
          oneOf:
            - $ref: '#/components/schemas/CustomLLM'
            - type: 'null'
          description: Definition for a custom LLM if LLM field is set to 'CUSTOM_LLM'
        ignore_default_personality:
          type:
            - boolean
            - 'null'
          default: false
          description: >-
            Whether to remove the default personality lines from the system
            prompt
        rag:
          $ref: '#/components/schemas/RagConfig'
          description: Configuration for RAG
        timezone:
          type:
            - string
            - 'null'
          description: >-
            Timezone for displaying current time in system prompt. If set, the
            current time will be included in the system prompt using this
            timezone. Must be a valid timezone name (e.g., 'America/New_York',
            'Europe/London', 'UTC').
        backup_llm_config:
          $ref: '#/components/schemas/PromptAgentApiModelOutputBackupLlmConfig'
          description: >-
            Configuration for backup LLM cascading. Can be disabled, use system
            defaults, or specify custom order.
        tools:
          type: array
          items:
            $ref: '#/components/schemas/PromptAgentApiModelOutputToolsItems'
          description: >-
            A list of tools that the agent can use over the course of the
            conversation, use tool_ids instead
    AgentConfigAPIModel-Output:
      type: object
      properties:
        first_message:
          type: string
          default: ''
          description: >-
            If non-empty, the first message the agent will say. If empty, the
            agent waits for the user to start the discussion.
        language:
          type: string
          default: en
          description: Language of the agent - used for ASR and TTS
        hinglish_mode:
          type: boolean
          default: false
          description: >-
            When enabled and language is Hindi, the agent will respond in
            Hinglish
        dynamic_variables:
          $ref: '#/components/schemas/DynamicVariablesConfig'
          description: Configuration for dynamic variables
        disable_first_message_interruptions:
          type: boolean
          default: false
          description: >-
            If true, the user will not be able to interrupt the agent while the
            first message is being delivered.
        prompt:
          $ref: '#/components/schemas/PromptAgentAPIModel-Output'
          description: The prompt for the agent
    ConversationalConfigAPIModel-Output:
      type: object
      properties:
        asr:
          $ref: '#/components/schemas/ASRConversationalConfig'
          description: Configuration for conversational transcription
        turn:
          $ref: '#/components/schemas/TurnConfig'
          description: Configuration for turn detection
        tts:
          $ref: '#/components/schemas/TTSConversationalConfig-Output'
          description: Configuration for conversational text to speech
        conversation:
          $ref: '#/components/schemas/ConversationConfig'
          description: Configuration for conversational events
        language_presets:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LanguagePreset-Output'
          description: Language presets for conversations
        vad:
          $ref: '#/components/schemas/VADConfig'
          description: Configuration for voice activity detection
        agent:
          $ref: '#/components/schemas/AgentConfigAPIModel-Output'
          description: Agent specific configuration
    AgentMetadataResponseModel:
      type: object
      properties:
        created_at_unix_secs:
          type: integer
          description: The creation time of the agent in unix seconds
        updated_at_unix_secs:
          type: integer
          description: The last update time of the agent in unix seconds
      required:
        - created_at_unix_secs
        - updated_at_unix_secs
    PromptEvaluationCriteria:
      type: object
      properties:
        id:
          type: string
          description: The unique identifier for the evaluation criteria
        name:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: prompt
          description: The type of evaluation criteria
        conversation_goal_prompt:
          type: string
          description: The prompt that the agent should use to evaluate the conversation
        use_knowledge_base:
          type: boolean
          default: false
          description: >-
            When evaluating the prompt, should the agent's knowledge base be
            used.
      required:
        - id
        - name
        - conversation_goal_prompt
    EvaluationSettings:
      type: object
      properties:
        criteria:
          type: array
          items:
            $ref: '#/components/schemas/PromptEvaluationCriteria'
          description: Individual criteria that the agent should be evaluated against
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
    WidgetConfigOutputAvatar:
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
    WidgetTermsTranslation:
      type: object
      properties:
        source_hash:
          type: string
        text:
          type: string
      required:
        - source_hash
        - text
    WidgetLanguagePreset:
      type: object
      properties:
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
        terms_translation:
          oneOf:
            - $ref: '#/components/schemas/WidgetTermsTranslation'
            - type: 'null'
          description: The translation cache for the terms
    WidgetConfig-Output:
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
          $ref: '#/components/schemas/WidgetConfigOutputAvatar'
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
        language_selector:
          type: boolean
          default: false
          description: Whether to show the language selector
        supports_text_only:
          type: boolean
          default: true
          description: Whether the widget can switch to text only mode
        custom_avatar_path:
          type:
            - string
            - 'null'
          description: The custom avatar path
        language_presets:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/WidgetLanguagePreset'
          description: Language presets for the widget
    SoftTimeoutConfigOverrideConfig:
      type: object
      properties:
        message:
          type: boolean
          default: false
          description: Whether to allow overriding the message field.
    TurnConfigOverrideConfig:
      type: object
      properties:
        soft_timeout_config:
          $ref: '#/components/schemas/SoftTimeoutConfigOverrideConfig'
          description: Configures overrides for nested fields.
    TTSConversationalConfigOverrideConfig:
      type: object
      properties:
        voice_id:
          type: boolean
          default: false
          description: Whether to allow overriding the voice_id field.
        stability:
          type: boolean
          default: false
          description: Whether to allow overriding the stability field.
        speed:
          type: boolean
          default: false
          description: Whether to allow overriding the speed field.
        similarity_boost:
          type: boolean
          default: false
          description: Whether to allow overriding the similarity_boost field.
    ConversationConfigOverrideConfig:
      type: object
      properties:
        text_only:
          type: boolean
          default: false
          description: Whether to allow overriding the text_only field.
    PromptAgentAPIModelOverrideConfig:
      type: object
      properties:
        prompt:
          type: boolean
          default: false
          description: Whether to allow overriding the prompt field.
        llm:
          type: boolean
          default: false
          description: Whether to allow overriding the llm field.
        native_mcp_server_ids:
          type: boolean
          default: false
          description: Whether to allow overriding the native_mcp_server_ids field.
    AgentConfigOverrideConfig:
      type: object
      properties:
        first_message:
          type: boolean
          default: false
          description: Whether to allow overriding the first_message field.
        language:
          type: boolean
          default: false
          description: Whether to allow overriding the language field.
        prompt:
          $ref: '#/components/schemas/PromptAgentAPIModelOverrideConfig'
          description: Configures overrides for nested fields.
    ConversationConfigClientOverrideConfig-Output:
      type: object
      properties:
        turn:
          $ref: '#/components/schemas/TurnConfigOverrideConfig'
          description: Configures overrides for nested fields.
        tts:
          $ref: '#/components/schemas/TTSConversationalConfigOverrideConfig'
          description: Configures overrides for nested fields.
        conversation:
          $ref: '#/components/schemas/ConversationConfigOverrideConfig'
          description: Configures overrides for nested fields.
        agent:
          $ref: '#/components/schemas/AgentConfigOverrideConfig'
          description: Configures overrides for nested fields.
    ConversationInitiationClientDataConfig-Output:
      type: object
      properties:
        conversation_config_override:
          $ref: '#/components/schemas/ConversationConfigClientOverrideConfig-Output'
          description: Overrides for the conversation configuration
        custom_llm_extra_body:
          type: boolean
          default: false
          description: Whether to include custom LLM extra body
        enable_conversation_initiation_client_data_from_webhook:
          type: boolean
          default: false
          description: Whether to enable conversation initiation client data from webhooks
    ConversationInitiationClientDataWebhookRequestHeaders:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAISecretLocator'
    ConversationInitiationClientDataWebhook:
      type: object
      properties:
        url:
          type: string
          description: The URL to send the webhook to
        request_headers:
          type: object
          additionalProperties:
            $ref: >-
              #/components/schemas/ConversationInitiationClientDataWebhookRequestHeaders
          description: The headers to send with the webhook request
      required:
        - url
        - request_headers
    WebhookEventType:
      type: string
      enum:
        - value: transcript
        - value: audio
        - value: call_initiation_failure
    ConvAIWebhooks:
      type: object
      properties:
        post_call_webhook_id:
          type:
            - string
            - 'null'
        events:
          type: array
          items:
            $ref: '#/components/schemas/WebhookEventType'
          description: >-
            List of event types to send via webhook. Options: transcript, audio,
            call_initiation_failure.
        send_audio:
          type:
            - boolean
            - 'null'
          description: >-
            DEPRECATED: Use 'events' field instead. Whether to send audio data
            with post-call webhooks for ConvAI conversations
    AgentWorkspaceOverrides-Output:
      type: object
      properties:
        conversation_initiation_client_data_webhook:
          oneOf:
            - $ref: '#/components/schemas/ConversationInitiationClientDataWebhook'
            - type: 'null'
          description: The webhook to send conversation initiation client data to
        webhooks:
          $ref: '#/components/schemas/ConvAIWebhooks'
    AttachedTestModel:
      type: object
      properties:
        test_id:
          type: string
        workflow_node_id:
          type:
            - string
            - 'null'
      required:
        - test_id
    AgentTestingSettings:
      type: object
      properties:
        attached_tests:
          type: array
          items:
            $ref: '#/components/schemas/AttachedTestModel'
          description: List of test IDs that should be run for this agent
    AllowlistItem:
      type: object
      properties:
        hostname:
          type: string
          description: The hostname of the allowed origin
      required:
        - hostname
    AuthSettings:
      type: object
      properties:
        enable_auth:
          type: boolean
          default: false
          description: >-
            If set to true, starting a conversation with an agent will require a
            signed token
        allowlist:
          type: array
          items:
            $ref: '#/components/schemas/AllowlistItem'
          description: >-
            A list of hosts that are allowed to start conversations with the
            agent
        shareable_token:
          type:
            - string
            - 'null'
          description: >-
            A shareable token that can be used to start a conversation with the
            agent
    AgentCallLimits:
      type: object
      properties:
        agent_concurrency_limit:
          type: integer
          default: -1
          description: >-
            The maximum number of concurrent conversations. -1 indicates that
            there is no maximum
        daily_limit:
          type: integer
          default: 100000
          description: The maximum number of conversations per day
        bursting_enabled:
          type: boolean
          default: true
          description: >-
            Whether to enable bursting. If true, exceeding workspace concurrency
            limit will be allowed up to 3 times the limit. Calls will be charged
            at double rate when exceeding the limit.
    PrivacyConfig:
      type: object
      properties:
        record_voice:
          type: boolean
          default: true
          description: Whether to record the conversation
        retention_days:
          type: integer
          default: -1
          description: >-
            The number of days to retain the conversation. -1 indicates there is
            no retention limit
        delete_transcript_and_pii:
          type: boolean
          default: false
          description: Whether to delete the transcript and PII
        delete_audio:
          type: boolean
          default: false
          description: Whether to delete the audio
        apply_to_existing_conversations:
          type: boolean
          default: false
          description: Whether to apply the privacy settings to existing conversations
        zero_retention_mode:
          type: boolean
          default: false
          description: Whether to enable zero retention mode - no PII data is stored
    SafetyResponseModel:
      type: object
      properties:
        is_blocked_ivc:
          type: boolean
          default: false
        is_blocked_non_ivc:
          type: boolean
          default: false
        ignore_safety_evaluation:
          type: boolean
          default: false
    AgentPlatformSettingsResponseModel:
      type: object
      properties:
        evaluation:
          $ref: '#/components/schemas/EvaluationSettings'
          description: Settings for evaluation
        widget:
          $ref: '#/components/schemas/WidgetConfig-Output'
          description: Configuration for the widget
        data_collection:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LiteralJsonSchemaProperty'
          description: Data collection settings
        overrides:
          $ref: '#/components/schemas/ConversationInitiationClientDataConfig-Output'
          description: Additional overrides for the agent during conversation initiation
        workspace_overrides:
          $ref: '#/components/schemas/AgentWorkspaceOverrides-Output'
          description: Workspace overrides for the agent
        testing:
          $ref: '#/components/schemas/AgentTestingSettings'
          description: Testing configuration for the agent
        archived:
          type: boolean
          default: false
          description: Whether the agent is archived
        auth:
          $ref: '#/components/schemas/AuthSettings'
          description: Settings for authentication
        call_limits:
          $ref: '#/components/schemas/AgentCallLimits'
          description: Call limits for the agent
        privacy:
          $ref: '#/components/schemas/PrivacyConfig'
          description: Privacy settings for the agent
        safety:
          $ref: '#/components/schemas/SafetyResponseModel'
    PhoneNumberAgentInfo:
      type: object
      properties:
        agent_id:
          type: string
          description: The ID of the agent
        agent_name:
          type: string
          description: The name of the agent
      required:
        - agent_id
        - agent_name
    GetPhoneNumberTwilioResponseModel:
      type: object
      properties:
        phone_number:
          type: string
          description: Phone number
        label:
          type: string
          description: Label for the phone number
        supports_inbound:
          type: boolean
          default: true
          description: Whether this phone number supports inbound calls
        supports_outbound:
          type: boolean
          default: true
          description: Whether this phone number supports outbound calls
        phone_number_id:
          type: string
          description: The ID of the phone number
        assigned_agent:
          oneOf:
            - $ref: '#/components/schemas/PhoneNumberAgentInfo'
            - type: 'null'
          description: The agent that is assigned to the phone number
        provider:
          type: string
          enum:
            - type: stringLiteral
              value: twilio
          description: Phone provider
      required:
        - phone_number
        - label
        - phone_number_id
    SIPTrunkTransportEnum:
      type: string
      enum:
        - value: auto
        - value: udp
        - value: tcp
        - value: tls
    SIPMediaEncryptionEnum:
      type: string
      enum:
        - value: disabled
        - value: allowed
        - value: required
    GetPhoneNumberOutboundSIPTrunkConfigResponseModel:
      type: object
      properties:
        address:
          type: string
          description: Hostname or IP the SIP INVITE is sent to
        transport:
          $ref: '#/components/schemas/SIPTrunkTransportEnum'
          description: Protocol to use for SIP transport
        media_encryption:
          $ref: '#/components/schemas/SIPMediaEncryptionEnum'
          description: Whether or not to encrypt media (data layer).
        headers:
          type: object
          additionalProperties:
            type: string
          description: SIP headers for INVITE request
        has_auth_credentials:
          type: boolean
          description: Whether authentication credentials are configured
        username:
          type:
            - string
            - 'null'
          description: SIP trunk username (if available)
        has_outbound_trunk:
          type: boolean
          default: false
          description: Whether a LiveKit SIP outbound trunk is configured
      required:
        - address
        - transport
        - media_encryption
        - has_auth_credentials
    GetPhoneNumberInboundSIPTrunkConfigResponseModel:
      type: object
      properties:
        allowed_addresses:
          type: array
          items:
            type: string
          description: >-
            List of IP addresses that are allowed to use the trunk. Each item in
            the list can be an individual IP address or a Classless Inter-Domain
            Routing notation representing a CIDR block.
        allowed_numbers:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of phone numbers that are allowed to use the trunk.
        media_encryption:
          $ref: '#/components/schemas/SIPMediaEncryptionEnum'
        has_auth_credentials:
          type: boolean
          description: Whether authentication credentials are configured
        username:
          type:
            - string
            - 'null'
          description: SIP trunk username (if available)
        remote_domains:
          type:
            - array
            - 'null'
          items:
            type: string
          description: Domains of remote SIP servers used to validate TLS certificates.
      required:
        - allowed_addresses
        - allowed_numbers
        - media_encryption
        - has_auth_credentials
    LivekitStackType:
      type: string
      enum:
        - value: standard
        - value: static
    GetPhoneNumberSIPTrunkResponseModel:
      type: object
      properties:
        phone_number:
          type: string
          description: Phone number
        label:
          type: string
          description: Label for the phone number
        supports_inbound:
          type: boolean
          default: true
          description: Whether this phone number supports inbound calls
        supports_outbound:
          type: boolean
          default: true
          description: Whether this phone number supports outbound calls
        phone_number_id:
          type: string
          description: The ID of the phone number
        assigned_agent:
          oneOf:
            - $ref: '#/components/schemas/PhoneNumberAgentInfo'
            - type: 'null'
          description: The agent that is assigned to the phone number
        provider:
          type: string
          enum:
            - type: stringLiteral
              value: sip_trunk
          description: Phone provider
        provider_config:
          oneOf:
            - $ref: >-
                #/components/schemas/GetPhoneNumberOutboundSIPTrunkConfigResponseModel
            - type: 'null'
        outbound_trunk:
          oneOf:
            - $ref: >-
                #/components/schemas/GetPhoneNumberOutboundSIPTrunkConfigResponseModel
            - type: 'null'
          description: Configuration of the Outbound SIP trunk - if configured.
        inbound_trunk:
          oneOf:
            - $ref: >-
                #/components/schemas/GetPhoneNumberInboundSIPTrunkConfigResponseModel
            - type: 'null'
          description: Configuration of the Inbound SIP trunk - if configured.
        livekit_stack:
          $ref: '#/components/schemas/LivekitStackType'
          description: Type of Livekit stack used for this number.
      required:
        - phone_number
        - label
        - phone_number_id
        - livekit_stack
    GetAgentResponseModelPhoneNumbersItems:
      oneOf:
        - $ref: '#/components/schemas/GetPhoneNumberTwilioResponseModel'
        - $ref: '#/components/schemas/GetPhoneNumberSIPTrunkResponseModel'
    WorkflowUnconditionalModel-Output:
      type: object
      properties:
        label:
          type:
            - string
            - 'null'
          description: >-
            Optional human-readable label for the condition used throughout the
            UI.
        type:
          type: string
          enum:
            - type: stringLiteral
              value: unconditional
      required:
        - label
        - type
    WorkflowLLMConditionModel-Output:
      type: object
      properties:
        label:
          type:
            - string
            - 'null'
          description: >-
            Optional human-readable label for the condition used throughout the
            UI.
        type:
          type: string
          enum:
            - type: stringLiteral
              value: llm
        condition:
          type: string
          description: Condition to evaluate
      required:
        - label
        - type
        - condition
    WorkflowResultConditionModel-Output:
      type: object
      properties:
        label:
          type:
            - string
            - 'null'
          description: >-
            Optional human-readable label for the condition used throughout the
            UI.
        type:
          type: string
          enum:
            - type: stringLiteral
              value: result
        successful:
          type: boolean
          description: >-
            Whether all tools in the previously executed tool node were executed
            successfully.
      required:
        - label
        - type
        - successful
    ASTStringNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: string_literal
        value:
          type: string
          description: Value of this literal.
      required:
        - type
        - value
    ASTNumberNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: number_literal
        value:
          type: number
          format: double
          description: Value of this literal.
      required:
        - type
        - value
    ASTBooleanNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: boolean_literal
        value:
          type: boolean
          description: Value of this literal.
      required:
        - type
        - value
    ASTLLMNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: llm
        prompt:
          type: string
          description: The prompt to evaluate to a boolean value.
      required:
        - type
        - prompt
    ASTDynamicVariableNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: dynamic_variable
        name:
          type: string
          description: The name of the dynamic variable.
      required:
        - type
        - name
    AstLessThanOrEqualsOperatorNodeOutputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    AstLessThanOrEqualsOperatorNodeOutputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    ASTLessThanOrEqualsOperatorNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: lte_operator
        left:
          $ref: '#/components/schemas/AstLessThanOrEqualsOperatorNodeOutputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstLessThanOrEqualsOperatorNodeOutputRight'
          description: Right operand of the binary operator.
      required:
        - type
        - left
        - right
    AstGreaterThanOrEqualsOperatorNodeOutputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    AstGreaterThanOrEqualsOperatorNodeOutputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    ASTGreaterThanOrEqualsOperatorNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: gte_operator
        left:
          $ref: '#/components/schemas/AstGreaterThanOrEqualsOperatorNodeOutputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstGreaterThanOrEqualsOperatorNodeOutputRight'
          description: Right operand of the binary operator.
      required:
        - type
        - left
        - right
    AstLessThanOperatorNodeOutputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    AstLessThanOperatorNodeOutputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    ASTLessThanOperatorNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: lt_operator
        left:
          $ref: '#/components/schemas/AstLessThanOperatorNodeOutputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstLessThanOperatorNodeOutputRight'
          description: Right operand of the binary operator.
      required:
        - type
        - left
        - right
    AstGreaterThanOperatorNodeOutputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    AstGreaterThanOperatorNodeOutputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    ASTGreaterThanOperatorNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: gt_operator
        left:
          $ref: '#/components/schemas/AstGreaterThanOperatorNodeOutputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstGreaterThanOperatorNodeOutputRight'
          description: Right operand of the binary operator.
      required:
        - type
        - left
        - right
    AstNotEqualsOperatorNodeOutputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    AstNotEqualsOperatorNodeOutputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    ASTNotEqualsOperatorNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: neq_operator
        left:
          $ref: '#/components/schemas/AstNotEqualsOperatorNodeOutputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstNotEqualsOperatorNodeOutputRight'
          description: Right operand of the binary operator.
      required:
        - type
        - left
        - right
    AstEqualsOperatorNodeOutputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    AstEqualsOperatorNodeOutputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    ASTEqualsOperatorNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: eq_operator
        left:
          $ref: '#/components/schemas/AstEqualsOperatorNodeOutputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstEqualsOperatorNodeOutputRight'
          description: Right operand of the binary operator.
      required:
        - type
        - left
        - right
    AstAndOperatorNodeOutputChildrenItems:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    ASTAndOperatorNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: and_operator
        children:
          type: array
          items:
            $ref: '#/components/schemas/AstAndOperatorNodeOutputChildrenItems'
          description: Child nodes of the logical operator.
      required:
        - type
        - children
    AstOrOperatorNodeOutputChildrenItems:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    ASTOrOperatorNode-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: or_operator
        children:
          type: array
          items:
            $ref: '#/components/schemas/AstOrOperatorNodeOutputChildrenItems'
          description: Child nodes of the logical operator.
      required:
        - type
        - children
    WorkflowExpressionConditionModelOutputExpression:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Output'
        - $ref: '#/components/schemas/ASTNumberNode-Output'
        - $ref: '#/components/schemas/ASTBooleanNode-Output'
        - $ref: '#/components/schemas/ASTLLMNode-Output'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Output'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Output'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Output'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Output'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Output'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Output'
    WorkflowExpressionConditionModel-Output:
      type: object
      properties:
        label:
          type:
            - string
            - 'null'
          description: >-
            Optional human-readable label for the condition used throughout the
            UI.
        type:
          type: string
          enum:
            - type: stringLiteral
              value: expression
        expression:
          $ref: >-
            #/components/schemas/WorkflowExpressionConditionModelOutputExpression
          description: Expression to evaluate.
      required:
        - label
        - type
        - expression
    WorkflowEdgeModelOutputForwardCondition:
      oneOf:
        - $ref: '#/components/schemas/WorkflowUnconditionalModel-Output'
        - $ref: '#/components/schemas/WorkflowLLMConditionModel-Output'
        - $ref: '#/components/schemas/WorkflowResultConditionModel-Output'
        - $ref: '#/components/schemas/WorkflowExpressionConditionModel-Output'
    WorkflowEdgeModelOutputBackwardCondition:
      oneOf:
        - $ref: '#/components/schemas/WorkflowUnconditionalModel-Output'
        - $ref: '#/components/schemas/WorkflowLLMConditionModel-Output'
        - $ref: '#/components/schemas/WorkflowResultConditionModel-Output'
        - $ref: '#/components/schemas/WorkflowExpressionConditionModel-Output'
    WorkflowEdgeModel-Output:
      type: object
      properties:
        source:
          type: string
          description: ID of the source node.
        target:
          type: string
          description: ID of the target node.
        forward_condition:
          oneOf:
            - $ref: '#/components/schemas/WorkflowEdgeModelOutputForwardCondition'
            - type: 'null'
          description: >-
            Condition that must be met for the edge to be traversed in the
            forward direction (source to target).
        backward_condition:
          oneOf:
            - $ref: '#/components/schemas/WorkflowEdgeModelOutputBackwardCondition'
            - type: 'null'
          description: >-
            Condition that must be met for the edge to be traversed in the
            backward direction (target to source).
      required:
        - source
        - target
        - forward_condition
        - backward_condition
    Position-Output:
      type: object
      properties:
        x:
          type: number
          format: double
          default: 0
        'y':
          type: number
          format: double
          default: 0
      required:
        - x
        - 'y'
    WorkflowStartNodeModel-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: start
        position:
          $ref: '#/components/schemas/Position-Output'
          description: Position of the node in the workflow.
        edge_order:
          type: array
          items:
            type: string
          description: The ids of outgoing edges in the order they should be evaluated.
      required:
        - type
        - position
        - edge_order
    WorkflowEndNodeModel-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: end
        position:
          $ref: '#/components/schemas/Position-Output'
          description: Position of the node in the workflow.
        edge_order:
          type: array
          items:
            type: string
          description: The ids of outgoing edges in the order they should be evaluated.
      required:
        - type
        - position
        - edge_order
    WorkflowPhoneNumberNodeModelOutputTransferDestination:
      oneOf:
        - $ref: '#/components/schemas/PhoneNumberTransferDestination'
        - $ref: '#/components/schemas/SIPUriTransferDestination'
        - $ref: '#/components/schemas/PhoneNumberDynamicVariableTransferDestination'
        - $ref: '#/components/schemas/SIPUriDynamicVariableTransferDestination'
    WorkflowPhoneNumberNodeModel-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: phone_number
        position:
          $ref: '#/components/schemas/Position-Output'
          description: Position of the node in the workflow.
        edge_order:
          type: array
          items:
            type: string
          description: The ids of outgoing edges in the order they should be evaluated.
        transfer_destination:
          $ref: >-
            #/components/schemas/WorkflowPhoneNumberNodeModelOutputTransferDestination
        transfer_type:
          $ref: '#/components/schemas/TransferTypeEnum'
      required:
        - type
        - position
        - edge_order
        - transfer_destination
        - transfer_type
    ASRConversationalConfigWorkflowOverride:
      type: object
      properties:
        quality:
          oneOf:
            - $ref: '#/components/schemas/ASRQuality'
            - type: 'null'
          description: The quality of the transcription
        provider:
          oneOf:
            - $ref: '#/components/schemas/ASRProvider'
            - type: 'null'
          description: The provider of the transcription service
        user_input_audio_format:
          oneOf:
            - $ref: '#/components/schemas/ASRInputFormat'
            - type: 'null'
          description: The format of the audio to be transcribed
        keywords:
          type:
            - array
            - 'null'
          items:
            type: string
          description: Keywords to boost prediction probability for
    SoftTimeoutConfigWorkflowOverride:
      type: object
      properties:
        timeout_seconds:
          type:
            - number
            - 'null'
          format: double
          description: >-
            Time in seconds before showing the predefined message while waiting
            for LLM response. Set to -1 to disable.
        message:
          type:
            - string
            - 'null'
          description: >-
            Message to show when soft timeout is reached while waiting for LLM
            response
    TurnConfigWorkflowOverride:
      type: object
      properties:
        turn_timeout:
          type:
            - number
            - 'null'
          format: double
          description: Maximum wait time for the user's reply before re-engaging the user
        initial_wait_time:
          type:
            - number
            - 'null'
          format: double
          description: >-
            How long the agent will wait for the user to start the conversation
            if the first message is empty. If not set, uses the regular
            turn_timeout.
        silence_end_call_timeout:
          type:
            - number
            - 'null'
          format: double
          description: >-
            Maximum wait time since the user last spoke before terminating the
            call
        soft_timeout_config:
          oneOf:
            - $ref: '#/components/schemas/SoftTimeoutConfigWorkflowOverride'
            - type: 'null'
          description: >-
            Configuration for soft timeout functionality. Provides immediate
            feedback during longer LLM responses.
        turn_eagerness:
          oneOf:
            - $ref: '#/components/schemas/TurnEagerness'
            - type: 'null'
          description: >-
            Controls how eager the agent is to respond. Low = less eager (waits
            longer), Standard = default eagerness, High = more eager (responds
            sooner)
    TTSConversationalConfigWorkflowOverride-Output:
      type: object
      properties:
        model_id:
          oneOf:
            - $ref: '#/components/schemas/TTSConversationalModel'
            - type: 'null'
          description: The model to use for TTS
        voice_id:
          type:
            - string
            - 'null'
          description: The voice ID to use for TTS
        supported_voices:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/SupportedVoice'
          description: Additional supported voices for the agent
        agent_output_audio_format:
          oneOf:
            - $ref: '#/components/schemas/TTSOutputFormat'
            - type: 'null'
          description: The audio format to use for TTS
        optimize_streaming_latency:
          oneOf:
            - $ref: '#/components/schemas/TTSOptimizeStreamingLatency'
            - type: 'null'
          description: The optimization for streaming latency
        stability:
          type:
            - number
            - 'null'
          format: double
          description: The stability of generated speech
        speed:
          type:
            - number
            - 'null'
          format: double
          description: The speed of generated speech
        similarity_boost:
          type:
            - number
            - 'null'
          format: double
          description: The similarity boost for generated speech
        text_normalisation_type:
          oneOf:
            - $ref: '#/components/schemas/TextNormalisationType'
            - type: 'null'
          description: >-
            Method for converting numbers to words before converting text to
            speech. If set to SYSTEM_PROMPT, the system prompt will be updated
            to include normalization instructions. If set to ELEVENLABS, the
            text will be normalized after generation, incurring slight
            additional latency.
        pronunciation_dictionary_locators:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/PydanticPronunciationDictionaryVersionLocator'
          description: The pronunciation dictionary locators
    ConversationConfigWorkflowOverride:
      type: object
      properties:
        text_only:
          type:
            - boolean
            - 'null'
          description: >-
            If enabled audio will not be processed and only text will be used,
            use to avoid audio pricing.
        max_duration_seconds:
          type:
            - integer
            - 'null'
          description: The maximum duration of a conversation in seconds
        client_events:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/ClientEvent'
          description: The events that will be sent to the client
        monitoring_enabled:
          type:
            - boolean
            - 'null'
          description: Enable real-time monitoring of conversations via WebSocket
        monitoring_events:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/ClientEvent'
          description: The events that will be sent to monitoring connections.
    VADConfigWorkflowOverride:
      type: object
      properties: {}
    DynamicVariablesConfigWorkflowOverrideDynamicVariablePlaceholders:
      oneOf:
        - type: string
        - type: number
          format: double
        - type: integer
        - type: boolean
    DynamicVariablesConfigWorkflowOverride:
      type: object
      properties:
        dynamic_variable_placeholders:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: >-
              #/components/schemas/DynamicVariablesConfigWorkflowOverrideDynamicVariablePlaceholders
          description: A dictionary of dynamic variable placeholders and their values
    BuiltInToolsWorkflowOverride-Output:
      type: object
      properties:
        end_call:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The end call tool
        language_detection:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The language detection tool
        transfer_to_agent:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The transfer to agent tool
        transfer_to_number:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The transfer to number tool
        skip_turn:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The skip turn tool
        play_keypad_touch_tone:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The play DTMF tool
        voicemail_detection:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Output'
            - type: 'null'
          description: The voicemail detection tool
    RagConfigWorkflowOverride:
      type: object
      properties:
        enabled:
          type:
            - boolean
            - 'null'
        embedding_model:
          oneOf:
            - $ref: '#/components/schemas/EmbeddingModelEnum'
            - type: 'null'
        max_vector_distance:
          type:
            - number
            - 'null'
          format: double
          description: Maximum vector distance of retrieved chunks.
        max_documents_length:
          type:
            - integer
            - 'null'
          description: Maximum total length of document chunks retrieved from RAG.
        max_retrieved_rag_chunks_count:
          type:
            - integer
            - 'null'
          description: >-
            Maximum number of RAG document chunks to initially retrieve from the
            vector store. These are then further filtered by vector distance and
            total length.
        query_rewrite_prompt_override:
          type:
            - string
            - 'null'
          description: >-
            Custom prompt for rewriting user queries before RAG retrieval. The
            conversation history will be automatically appended at the end. If
            not set, the default prompt will be used.
    PromptAgentApiModelWorkflowOverrideOutputBackupLlmConfig:
      oneOf:
        - $ref: '#/components/schemas/BackupLLMDefault'
        - $ref: '#/components/schemas/BackupLLMDisabled'
        - $ref: '#/components/schemas/BackupLLMOverride'
    PromptAgentApiModelWorkflowOverrideOutputToolsItems:
      oneOf:
        - $ref: '#/components/schemas/WebhookToolConfig-Output'
        - $ref: '#/components/schemas/ClientToolConfig-Output'
        - $ref: '#/components/schemas/SystemToolConfig-Output'
        - $ref: '#/components/schemas/ApiIntegrationWebhookToolConfig-Output'
    PromptAgentAPIModelWorkflowOverride-Output:
      type: object
      properties:
        prompt:
          type:
            - string
            - 'null'
          description: The prompt for the agent
        llm:
          oneOf:
            - $ref: '#/components/schemas/LLM'
            - type: 'null'
          description: >-
            The LLM to query with the prompt and the chat history. If using data
            residency, the LLM must be supported in the data residency
            environment
        reasoning_effort:
          oneOf:
            - $ref: '#/components/schemas/LLMReasoningEffort'
            - type: 'null'
          description: Reasoning effort of the model. Only available for some models.
        thinking_budget:
          type:
            - integer
            - 'null'
          description: >-
            Max number of tokens used for thinking. Use 0 to turn off if
            supported by the model.
        temperature:
          type:
            - number
            - 'null'
          format: double
          description: The temperature for the LLM
        max_tokens:
          type:
            - integer
            - 'null'
          description: If greater than 0, maximum number of tokens the LLM can predict
        tool_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of IDs of tools used by the agent
        built_in_tools:
          oneOf:
            - $ref: '#/components/schemas/BuiltInToolsWorkflowOverride-Output'
            - type: 'null'
          description: Built-in system tools to be used by the agent
        mcp_server_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of MCP server ids to be used by the agent
        native_mcp_server_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of Native MCP server ids to be used by the agent
        knowledge_base:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/KnowledgeBaseLocator'
          description: A list of knowledge bases to be used by the agent
        custom_llm:
          oneOf:
            - $ref: '#/components/schemas/CustomLLM'
            - type: 'null'
          description: Definition for a custom LLM if LLM field is set to 'CUSTOM_LLM'
        ignore_default_personality:
          type:
            - boolean
            - 'null'
          description: >-
            Whether to remove the default personality lines from the system
            prompt
        rag:
          oneOf:
            - $ref: '#/components/schemas/RagConfigWorkflowOverride'
            - type: 'null'
          description: Configuration for RAG
        timezone:
          type:
            - string
            - 'null'
          description: >-
            Timezone for displaying current time in system prompt. If set, the
            current time will be included in the system prompt using this
            timezone. Must be a valid timezone name (e.g., 'America/New_York',
            'Europe/London', 'UTC').
        backup_llm_config:
          oneOf:
            - $ref: >-
                #/components/schemas/PromptAgentApiModelWorkflowOverrideOutputBackupLlmConfig
            - type: 'null'
          description: >-
            Configuration for backup LLM cascading. Can be disabled, use system
            defaults, or specify custom order.
        tools:
          type:
            - array
            - 'null'
          items:
            $ref: >-
              #/components/schemas/PromptAgentApiModelWorkflowOverrideOutputToolsItems
          description: >-
            A list of tools that the agent can use over the course of the
            conversation, use tool_ids instead
    AgentConfigAPIModelWorkflowOverride-Output:
      type: object
      properties:
        first_message:
          type:
            - string
            - 'null'
          description: >-
            If non-empty, the first message the agent will say. If empty, the
            agent waits for the user to start the discussion.
        language:
          type:
            - string
            - 'null'
          description: Language of the agent - used for ASR and TTS
        hinglish_mode:
          type:
            - boolean
            - 'null'
          description: >-
            When enabled and language is Hindi, the agent will respond in
            Hinglish
        dynamic_variables:
          oneOf:
            - $ref: '#/components/schemas/DynamicVariablesConfigWorkflowOverride'
            - type: 'null'
          description: Configuration for dynamic variables
        disable_first_message_interruptions:
          type:
            - boolean
            - 'null'
          description: >-
            If true, the user will not be able to interrupt the agent while the
            first message is being delivered.
        prompt:
          oneOf:
            - $ref: '#/components/schemas/PromptAgentAPIModelWorkflowOverride-Output'
            - type: 'null'
          description: The prompt for the agent
    ConversationalConfigAPIModelWorkflowOverride-Output:
      type: object
      properties:
        asr:
          oneOf:
            - $ref: '#/components/schemas/ASRConversationalConfigWorkflowOverride'
            - type: 'null'
          description: Configuration for conversational transcription
        turn:
          oneOf:
            - $ref: '#/components/schemas/TurnConfigWorkflowOverride'
            - type: 'null'
          description: Configuration for turn detection
        tts:
          oneOf:
            - $ref: >-
                #/components/schemas/TTSConversationalConfigWorkflowOverride-Output
            - type: 'null'
          description: Configuration for conversational text to speech
        conversation:
          oneOf:
            - $ref: '#/components/schemas/ConversationConfigWorkflowOverride'
            - type: 'null'
          description: Configuration for conversational events
        language_presets:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: '#/components/schemas/LanguagePreset-Output'
          description: Language presets for conversations
        vad:
          oneOf:
            - $ref: '#/components/schemas/VADConfigWorkflowOverride'
            - type: 'null'
          description: Configuration for voice activity detection
        agent:
          oneOf:
            - $ref: '#/components/schemas/AgentConfigAPIModelWorkflowOverride-Output'
            - type: 'null'
          description: Agent specific configuration
    WorkflowOverrideAgentNodeModel-Output:
      type: object
      properties:
        conversation_config:
          $ref: >-
            #/components/schemas/ConversationalConfigAPIModelWorkflowOverride-Output
          description: >-
            Configuration overrides applied while the subagent is conducting the
            conversation.
        additional_prompt:
          type: string
          description: >-
            Specific goal for this subagent. It will be added to the system
            prompt and can be used to further refine the agent's behavior in
            this specific context.
        additional_knowledge_base:
          type: array
          items:
            $ref: '#/components/schemas/KnowledgeBaseLocator'
          description: >-
            Additional knowledge base documents that the subagent has access to.
            These will be used in addition to the main agent's documents.
        additional_tool_ids:
          type: array
          items:
            type: string
          description: >-
            IDs of additional tools that the subagent has access to. These will
            be used in addition to the main agent's tools.
        type:
          type: string
          enum:
            - type: stringLiteral
              value: override_agent
        position:
          $ref: '#/components/schemas/Position-Output'
          description: Position of the node in the workflow.
        edge_order:
          type: array
          items:
            type: string
          description: The ids of outgoing edges in the order they should be evaluated.
        label:
          type: string
          description: Human-readable label for the node used throughout the UI.
      required:
        - conversation_config
        - additional_prompt
        - additional_knowledge_base
        - additional_tool_ids
        - type
        - position
        - edge_order
        - label
    WorkflowStandaloneAgentNodeModel-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: standalone_agent
        position:
          $ref: '#/components/schemas/Position-Output'
          description: Position of the node in the workflow.
        edge_order:
          type: array
          items:
            type: string
          description: The ids of outgoing edges in the order they should be evaluated.
        agent_id:
          type: string
          description: The ID of the agent to transfer the conversation to.
        delay_ms:
          type: integer
          default: 0
          description: >-
            Artificial delay in milliseconds applied before transferring the
            conversation.
        transfer_message:
          type:
            - string
            - 'null'
          description: Optional message sent to the user before the transfer is initiated.
        enable_transferred_agent_first_message:
          type: boolean
          default: false
          description: >-
            Whether to enable the transferred agent to send its configured first
            message after the transfer.
      required:
        - type
        - position
        - edge_order
        - agent_id
        - delay_ms
        - transfer_message
        - enable_transferred_agent_first_message
    WorkflowToolLocator:
      type: object
      properties:
        tool_id:
          type: string
      required:
        - tool_id
    WorkflowToolNodeModel-Output:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: tool
        position:
          $ref: '#/components/schemas/Position-Output'
          description: Position of the node in the workflow.
        edge_order:
          type: array
          items:
            type: string
          description: The ids of outgoing edges in the order they should be evaluated.
        tools:
          type: array
          items:
            $ref: '#/components/schemas/WorkflowToolLocator'
          description: >-
            List of tools to execute in parallel. The entire node is considered
            successful if all tools are executed successfully.
      required:
        - type
        - position
        - edge_order
        - tools
    AgentWorkflowResponseModelNodes:
      oneOf:
        - $ref: '#/components/schemas/WorkflowStartNodeModel-Output'
        - $ref: '#/components/schemas/WorkflowEndNodeModel-Output'
        - $ref: '#/components/schemas/WorkflowPhoneNumberNodeModel-Output'
        - $ref: '#/components/schemas/WorkflowOverrideAgentNodeModel-Output'
        - $ref: '#/components/schemas/WorkflowStandaloneAgentNodeModel-Output'
        - $ref: '#/components/schemas/WorkflowToolNodeModel-Output'
    AgentWorkflowResponseModel:
      type: object
      properties:
        edges:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/WorkflowEdgeModel-Output'
        nodes:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/AgentWorkflowResponseModelNodes'
        prevent_subagent_loops:
          type: boolean
          default: false
          description: Whether to prevent loops in the workflow execution.
      required:
        - edges
        - nodes
        - prevent_subagent_loops
    ResourceAccessInfoRole:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    ResourceAccessInfo:
      type: object
      properties:
        is_creator:
          type: boolean
          description: Whether the user making the request is the creator of the agent
        creator_name:
          type: string
          description: Name of the agent's creator
        creator_email:
          type: string
          description: Email of the agent's creator
        role:
          $ref: '#/components/schemas/ResourceAccessInfoRole'
          description: The role of the user making the request
      required:
        - is_creator
        - creator_name
        - creator_email
        - role
    GetAgentResponseModel:
      type: object
      properties:
        agent_id:
          type: string
          description: The ID of the agent
        name:
          type: string
          description: The name of the agent
        conversation_config:
          $ref: '#/components/schemas/ConversationalConfigAPIModel-Output'
          description: The conversation configuration of the agent
        metadata:
          $ref: '#/components/schemas/AgentMetadataResponseModel'
          description: The metadata of the agent
        platform_settings:
          $ref: '#/components/schemas/AgentPlatformSettingsResponseModel'
          description: The platform settings of the agent
        phone_numbers:
          type: array
          items:
            $ref: '#/components/schemas/GetAgentResponseModelPhoneNumbersItems'
          description: The phone numbers of the agent
        workflow:
          $ref: '#/components/schemas/AgentWorkflowResponseModel'
          description: The workflow of the agent
        access_info:
          oneOf:
            - $ref: '#/components/schemas/ResourceAccessInfo'
            - type: 'null'
          description: The access information of the agent for the user
        tags:
          type: array
          items:
            type: string
          description: Agent tags used to categorize the agent
      required:
        - agent_id
        - name
        - conversation_config
        - metadata

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.agents.get("agent_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.agents.get(
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

	url := "https://api.elevenlabs.io/v1/convai/agents/agent_id"

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

url = URI("https://api.elevenlabs.io/v1/convai/agents/agent_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/agents/agent_id")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/agents/agent_id', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/agents/agent_id");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/agents/agent_id")! as URL,
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