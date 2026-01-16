# Run tests on agent

POST https://api.elevenlabs.io/v1/convai/agents/{agent_id}/run-tests
Content-Type: application/json

Run selected tests on the agent with provided configuration. If the agent configuration is provided, it will be used to override default agent configuration.

Reference: https://elevenlabs.io/docs/api-reference/tests/run-tests

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Run Tests On The Agent
  version: endpoint_conversationalAi/agents.run_tests
paths:
  /v1/convai/agents/{agent_id}/run-tests:
    post:
      operationId: run-tests
      summary: Run Tests On The Agent
      description: >-
        Run selected tests on the agent with provided configuration. If the
        agent configuration is provided, it will be used to override default
        agent configuration.
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
                $ref: '#/components/schemas/GetTestSuiteInvocationResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RunAgentTestsRequestModel'
components:
  schemas:
    SingleTestRunRequestModel:
      type: object
      properties:
        test_id:
          type: string
          description: ID of the test to run
        workflow_node_id:
          type:
            - string
            - 'null'
          description: >-
            ID of the workflow node to run the test on. If not provided, the
            test will be run on the agent's default workflow node.
      required:
        - test_id
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
    TTSConversationalConfig-Input:
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
    AgentConfigOverride-Input:
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
    ConversationConfigClientOverride-Input:
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
            - $ref: '#/components/schemas/AgentConfigOverride-Input'
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
    LanguagePreset-Input:
      type: object
      properties:
        overrides:
          $ref: '#/components/schemas/ConversationConfigClientOverride-Input'
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
    TransferToNumberToolConfig-Input:
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
    SystemToolConfigInputParams:
      oneOf:
        - $ref: '#/components/schemas/EndCallToolConfig'
        - $ref: '#/components/schemas/LanguageDetectionToolConfig'
        - $ref: '#/components/schemas/TransferToAgentToolConfig'
        - $ref: '#/components/schemas/TransferToNumberToolConfig-Input'
        - $ref: '#/components/schemas/SkipTurnToolConfig'
        - $ref: '#/components/schemas/PlayDTMFToolConfig'
        - $ref: '#/components/schemas/VoicemailDetectionToolConfig'
    SystemToolConfig-Input:
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
          $ref: '#/components/schemas/SystemToolConfigInputParams'
      required:
        - name
        - params
    BuiltInTools-Input:
      type: object
      properties:
        end_call:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The end call tool
        language_detection:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The language detection tool
        transfer_to_agent:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The transfer to agent tool
        transfer_to_number:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The transfer to number tool
        skip_turn:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The skip turn tool
        play_keypad_touch_tone:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The play DTMF tool
        voicemail_detection:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
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
    PromptAgentApiModelInputBackupLlmConfig:
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
    WebhookToolApiSchemaConfigInputRequestHeaders:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAISecretLocator'
        - $ref: '#/components/schemas/ConvAIDynamicVariable'
    WebhookToolApiSchemaConfigInputMethod:
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
    ArrayJsonSchemaPropertyInputItems:
      oneOf:
        - $ref: '#/components/schemas/LiteralJsonSchemaProperty'
        - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Input'
        - $ref: '#/components/schemas/ArrayJsonSchemaProperty-Input'
    ArrayJsonSchemaProperty-Input:
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
          $ref: '#/components/schemas/ArrayJsonSchemaPropertyInputItems'
      required:
        - items
    ObjectJsonSchemaPropertyInput:
      oneOf:
        - $ref: '#/components/schemas/LiteralJsonSchemaProperty'
        - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Input'
        - $ref: '#/components/schemas/ArrayJsonSchemaProperty-Input'
    ObjectJsonSchemaProperty-Input:
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
            $ref: '#/components/schemas/ObjectJsonSchemaPropertyInput'
    WebhookToolApiSchemaConfigInputContentType:
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
    WebhookToolApiSchemaConfig-Input:
      type: object
      properties:
        request_headers:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/WebhookToolApiSchemaConfigInputRequestHeaders'
          description: Headers that should be included in the request
        url:
          type: string
          description: >-
            The URL that the webhook will be sent to. May include path
            parameters, e.g. https://example.com/agents/{agent_id}
        method:
          $ref: '#/components/schemas/WebhookToolApiSchemaConfigInputMethod'
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
            - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Input'
            - type: 'null'
          description: >-
            Schema for the body parameters, if any. Used for POST/PATCH/PUT
            requests. The schema should be an object which will be sent as the
            json body
        content_type:
          $ref: '#/components/schemas/WebhookToolApiSchemaConfigInputContentType'
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
    WebhookToolConfig-Input:
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
          $ref: '#/components/schemas/WebhookToolApiSchemaConfig-Input'
          description: >-
            The schema for the outgoing webhoook, including parameters and URL
            specification
      required:
        - name
        - description
        - api_schema
    ClientToolConfig-Input:
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
            - $ref: '#/components/schemas/ObjectJsonSchemaProperty-Input'
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
    ObjectOverrideInput:
      oneOf:
        - $ref: '#/components/schemas/LiteralOverride'
        - $ref: '#/components/schemas/ObjectOverride-Input'
    ObjectOverride-Input:
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
            $ref: '#/components/schemas/ObjectOverrideInput'
        required:
          type:
            - array
            - 'null'
          items:
            type: string
    ApiIntegrationWebhookOverridesInputRequestHeaders:
      oneOf:
        - type: string
        - $ref: '#/components/schemas/ConvAIDynamicVariable'
    ApiIntegrationWebhookOverrides-Input:
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
            - $ref: '#/components/schemas/ObjectOverride-Input'
            - type: 'null'
        request_headers:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: >-
              #/components/schemas/ApiIntegrationWebhookOverridesInputRequestHeaders
    ApiIntegrationWebhookToolConfig-Input:
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
            - $ref: '#/components/schemas/ApiIntegrationWebhookOverrides-Input'
            - type: 'null'
          description: User overrides applied on top of the base api_schema
      required:
        - name
        - description
        - api_integration_id
        - api_integration_connection_id
    PromptAgentApiModelInputToolsItems:
      oneOf:
        - $ref: '#/components/schemas/WebhookToolConfig-Input'
        - $ref: '#/components/schemas/ClientToolConfig-Input'
        - $ref: '#/components/schemas/SystemToolConfig-Input'
        - $ref: '#/components/schemas/ApiIntegrationWebhookToolConfig-Input'
    PromptAgentAPIModel-Input:
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
          $ref: '#/components/schemas/BuiltInTools-Input'
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
          $ref: '#/components/schemas/PromptAgentApiModelInputBackupLlmConfig'
          description: >-
            Configuration for backup LLM cascading. Can be disabled, use system
            defaults, or specify custom order.
        tools:
          type: array
          items:
            $ref: '#/components/schemas/PromptAgentApiModelInputToolsItems'
          description: >-
            A list of tools that the agent can use over the course of the
            conversation, use tool_ids instead
    AgentConfigAPIModel-Input:
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
          $ref: '#/components/schemas/PromptAgentAPIModel-Input'
          description: The prompt for the agent
    ConversationalConfigAPIModel-Input:
      type: object
      properties:
        asr:
          $ref: '#/components/schemas/ASRConversationalConfig'
          description: Configuration for conversational transcription
        turn:
          $ref: '#/components/schemas/TurnConfig'
          description: Configuration for turn detection
        tts:
          $ref: '#/components/schemas/TTSConversationalConfig-Input'
          description: Configuration for conversational text to speech
        conversation:
          $ref: '#/components/schemas/ConversationConfig'
          description: Configuration for conversational events
        language_presets:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LanguagePreset-Input'
          description: Language presets for conversations
        vad:
          $ref: '#/components/schemas/VADConfig'
          description: Configuration for voice activity detection
        agent:
          $ref: '#/components/schemas/AgentConfigAPIModel-Input'
          description: Agent specific configuration
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
    WidgetConfigInputAvatar:
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
    WidgetConfig-Input:
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
          $ref: '#/components/schemas/WidgetConfigInputAvatar'
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
    ConversationConfigClientOverrideConfig-Input:
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
    ConversationInitiationClientDataConfig-Input:
      type: object
      properties:
        conversation_config_override:
          $ref: '#/components/schemas/ConversationConfigClientOverrideConfig-Input'
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
    AgentWorkspaceOverrides-Input:
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
    AgentPlatformSettingsRequestModel:
      type: object
      properties:
        evaluation:
          $ref: '#/components/schemas/EvaluationSettings'
          description: Settings for evaluation
        widget:
          $ref: '#/components/schemas/WidgetConfig-Input'
          description: Configuration for the widget
        data_collection:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LiteralJsonSchemaProperty'
          description: Data collection settings
        overrides:
          $ref: '#/components/schemas/ConversationInitiationClientDataConfig-Input'
          description: Additional overrides for the agent during conversation initiation
        workspace_overrides:
          $ref: '#/components/schemas/AgentWorkspaceOverrides-Input'
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
    WorkflowUnconditionalModel-Input:
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
    WorkflowLLMConditionModel-Input:
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
        - condition
    WorkflowResultConditionModel-Input:
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
        - successful
    ASTStringNode-Input:
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
        - value
    ASTNumberNode-Input:
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
        - value
    ASTBooleanNode-Input:
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
        - value
    ASTLLMNode-Input:
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
        - prompt
    ASTDynamicVariableNode-Input:
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
        - name
    AstLessThanOrEqualsOperatorNodeInputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    AstLessThanOrEqualsOperatorNodeInputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    ASTLessThanOrEqualsOperatorNode-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: lte_operator
        left:
          $ref: '#/components/schemas/AstLessThanOrEqualsOperatorNodeInputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstLessThanOrEqualsOperatorNodeInputRight'
          description: Right operand of the binary operator.
      required:
        - left
        - right
    AstGreaterThanOrEqualsOperatorNodeInputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    AstGreaterThanOrEqualsOperatorNodeInputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    ASTGreaterThanOrEqualsOperatorNode-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: gte_operator
        left:
          $ref: '#/components/schemas/AstGreaterThanOrEqualsOperatorNodeInputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstGreaterThanOrEqualsOperatorNodeInputRight'
          description: Right operand of the binary operator.
      required:
        - left
        - right
    AstLessThanOperatorNodeInputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    AstLessThanOperatorNodeInputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    ASTLessThanOperatorNode-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: lt_operator
        left:
          $ref: '#/components/schemas/AstLessThanOperatorNodeInputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstLessThanOperatorNodeInputRight'
          description: Right operand of the binary operator.
      required:
        - left
        - right
    AstGreaterThanOperatorNodeInputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    AstGreaterThanOperatorNodeInputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    ASTGreaterThanOperatorNode-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: gt_operator
        left:
          $ref: '#/components/schemas/AstGreaterThanOperatorNodeInputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstGreaterThanOperatorNodeInputRight'
          description: Right operand of the binary operator.
      required:
        - left
        - right
    AstNotEqualsOperatorNodeInputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    AstNotEqualsOperatorNodeInputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    ASTNotEqualsOperatorNode-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: neq_operator
        left:
          $ref: '#/components/schemas/AstNotEqualsOperatorNodeInputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstNotEqualsOperatorNodeInputRight'
          description: Right operand of the binary operator.
      required:
        - left
        - right
    AstEqualsOperatorNodeInputLeft:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    AstEqualsOperatorNodeInputRight:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    ASTEqualsOperatorNode-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: eq_operator
        left:
          $ref: '#/components/schemas/AstEqualsOperatorNodeInputLeft'
          description: Left operand of the binary operator.
        right:
          $ref: '#/components/schemas/AstEqualsOperatorNodeInputRight'
          description: Right operand of the binary operator.
      required:
        - left
        - right
    AstAndOperatorNodeInputChildrenItems:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    ASTAndOperatorNode-Input:
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
            $ref: '#/components/schemas/AstAndOperatorNodeInputChildrenItems'
          description: Child nodes of the logical operator.
      required:
        - children
    AstOrOperatorNodeInputChildrenItems:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    ASTOrOperatorNode-Input:
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
            $ref: '#/components/schemas/AstOrOperatorNodeInputChildrenItems'
          description: Child nodes of the logical operator.
      required:
        - children
    WorkflowExpressionConditionModelInputExpression:
      oneOf:
        - $ref: '#/components/schemas/ASTStringNode-Input'
        - $ref: '#/components/schemas/ASTNumberNode-Input'
        - $ref: '#/components/schemas/ASTBooleanNode-Input'
        - $ref: '#/components/schemas/ASTLLMNode-Input'
        - $ref: '#/components/schemas/ASTDynamicVariableNode-Input'
        - $ref: '#/components/schemas/ASTOrOperatorNode-Input'
        - $ref: '#/components/schemas/ASTAndOperatorNode-Input'
        - $ref: '#/components/schemas/ASTEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTNotEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOperatorNode-Input'
        - $ref: '#/components/schemas/ASTGreaterThanOrEqualsOperatorNode-Input'
        - $ref: '#/components/schemas/ASTLessThanOrEqualsOperatorNode-Input'
    WorkflowExpressionConditionModel-Input:
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
          $ref: '#/components/schemas/WorkflowExpressionConditionModelInputExpression'
          description: Expression to evaluate.
      required:
        - expression
    WorkflowEdgeModelInputForwardCondition:
      oneOf:
        - $ref: '#/components/schemas/WorkflowUnconditionalModel-Input'
        - $ref: '#/components/schemas/WorkflowLLMConditionModel-Input'
        - $ref: '#/components/schemas/WorkflowResultConditionModel-Input'
        - $ref: '#/components/schemas/WorkflowExpressionConditionModel-Input'
    WorkflowEdgeModelInputBackwardCondition:
      oneOf:
        - $ref: '#/components/schemas/WorkflowUnconditionalModel-Input'
        - $ref: '#/components/schemas/WorkflowLLMConditionModel-Input'
        - $ref: '#/components/schemas/WorkflowResultConditionModel-Input'
        - $ref: '#/components/schemas/WorkflowExpressionConditionModel-Input'
    WorkflowEdgeModel-Input:
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
            - $ref: '#/components/schemas/WorkflowEdgeModelInputForwardCondition'
            - type: 'null'
          description: >-
            Condition that must be met for the edge to be traversed in the
            forward direction (source to target).
        backward_condition:
          oneOf:
            - $ref: '#/components/schemas/WorkflowEdgeModelInputBackwardCondition'
            - type: 'null'
          description: >-
            Condition that must be met for the edge to be traversed in the
            backward direction (target to source).
      required:
        - source
        - target
    Position-Input:
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
    WorkflowStartNodeModel-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: start
        position:
          $ref: '#/components/schemas/Position-Input'
          description: Position of the node in the workflow.
        edge_order:
          type: array
          items:
            type: string
          description: The ids of outgoing edges in the order they should be evaluated.
    WorkflowEndNodeModel-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: end
        position:
          $ref: '#/components/schemas/Position-Input'
          description: Position of the node in the workflow.
        edge_order:
          type: array
          items:
            type: string
          description: The ids of outgoing edges in the order they should be evaluated.
    WorkflowPhoneNumberNodeModelInputTransferDestination:
      oneOf:
        - $ref: '#/components/schemas/PhoneNumberTransferDestination'
        - $ref: '#/components/schemas/SIPUriTransferDestination'
        - $ref: '#/components/schemas/PhoneNumberDynamicVariableTransferDestination'
        - $ref: '#/components/schemas/SIPUriDynamicVariableTransferDestination'
    WorkflowPhoneNumberNodeModel-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: phone_number
        position:
          $ref: '#/components/schemas/Position-Input'
          description: Position of the node in the workflow.
        edge_order:
          type: array
          items:
            type: string
          description: The ids of outgoing edges in the order they should be evaluated.
        transfer_destination:
          $ref: >-
            #/components/schemas/WorkflowPhoneNumberNodeModelInputTransferDestination
        transfer_type:
          $ref: '#/components/schemas/TransferTypeEnum'
      required:
        - transfer_destination
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
    TTSConversationalConfigWorkflowOverride-Input:
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
    BuiltInToolsWorkflowOverride-Input:
      type: object
      properties:
        end_call:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The end call tool
        language_detection:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The language detection tool
        transfer_to_agent:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The transfer to agent tool
        transfer_to_number:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The transfer to number tool
        skip_turn:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The skip turn tool
        play_keypad_touch_tone:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
            - type: 'null'
          description: The play DTMF tool
        voicemail_detection:
          oneOf:
            - $ref: '#/components/schemas/SystemToolConfig-Input'
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
    PromptAgentApiModelWorkflowOverrideInputBackupLlmConfig:
      oneOf:
        - $ref: '#/components/schemas/BackupLLMDefault'
        - $ref: '#/components/schemas/BackupLLMDisabled'
        - $ref: '#/components/schemas/BackupLLMOverride'
    PromptAgentApiModelWorkflowOverrideInputToolsItems:
      oneOf:
        - $ref: '#/components/schemas/WebhookToolConfig-Input'
        - $ref: '#/components/schemas/ClientToolConfig-Input'
        - $ref: '#/components/schemas/SystemToolConfig-Input'
        - $ref: '#/components/schemas/ApiIntegrationWebhookToolConfig-Input'
    PromptAgentAPIModelWorkflowOverride-Input:
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
            - $ref: '#/components/schemas/BuiltInToolsWorkflowOverride-Input'
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
                #/components/schemas/PromptAgentApiModelWorkflowOverrideInputBackupLlmConfig
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
              #/components/schemas/PromptAgentApiModelWorkflowOverrideInputToolsItems
          description: >-
            A list of tools that the agent can use over the course of the
            conversation, use tool_ids instead
    AgentConfigAPIModelWorkflowOverride-Input:
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
            - $ref: '#/components/schemas/PromptAgentAPIModelWorkflowOverride-Input'
            - type: 'null'
          description: The prompt for the agent
    ConversationalConfigAPIModelWorkflowOverride-Input:
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
                #/components/schemas/TTSConversationalConfigWorkflowOverride-Input
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
            $ref: '#/components/schemas/LanguagePreset-Input'
          description: Language presets for conversations
        vad:
          oneOf:
            - $ref: '#/components/schemas/VADConfigWorkflowOverride'
            - type: 'null'
          description: Configuration for voice activity detection
        agent:
          oneOf:
            - $ref: '#/components/schemas/AgentConfigAPIModelWorkflowOverride-Input'
            - type: 'null'
          description: Agent specific configuration
    WorkflowOverrideAgentNodeModel-Input:
      type: object
      properties:
        conversation_config:
          $ref: >-
            #/components/schemas/ConversationalConfigAPIModelWorkflowOverride-Input
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
          $ref: '#/components/schemas/Position-Input'
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
        - label
    WorkflowStandaloneAgentNodeModel-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: standalone_agent
        position:
          $ref: '#/components/schemas/Position-Input'
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
        - agent_id
    WorkflowToolLocator:
      type: object
      properties:
        tool_id:
          type: string
      required:
        - tool_id
    WorkflowToolNodeModel-Input:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: tool
        position:
          $ref: '#/components/schemas/Position-Input'
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
    AgentWorkflowRequestModelNodes:
      oneOf:
        - $ref: '#/components/schemas/WorkflowStartNodeModel-Input'
        - $ref: '#/components/schemas/WorkflowEndNodeModel-Input'
        - $ref: '#/components/schemas/WorkflowPhoneNumberNodeModel-Input'
        - $ref: '#/components/schemas/WorkflowOverrideAgentNodeModel-Input'
        - $ref: '#/components/schemas/WorkflowStandaloneAgentNodeModel-Input'
        - $ref: '#/components/schemas/WorkflowToolNodeModel-Input'
    AgentWorkflowRequestModel:
      type: object
      properties:
        edges:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/WorkflowEdgeModel-Input'
        nodes:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/AgentWorkflowRequestModelNodes'
        prevent_subagent_loops:
          type: boolean
          default: false
          description: Whether to prevent loops in the workflow execution.
    AdhocAgentConfigOverrideForTestRequestModel:
      type: object
      properties:
        conversation_config:
          $ref: '#/components/schemas/ConversationalConfigAPIModel-Input'
        platform_settings:
          $ref: '#/components/schemas/AgentPlatformSettingsRequestModel'
        workflow:
          oneOf:
            - $ref: '#/components/schemas/AgentWorkflowRequestModel'
            - type: 'null'
      required:
        - conversation_config
        - platform_settings
    RunAgentTestsRequestModel:
      type: object
      properties:
        tests:
          type: array
          items:
            $ref: '#/components/schemas/SingleTestRunRequestModel'
          description: List of tests to run on the agent
        agent_config_override:
          oneOf:
            - $ref: '#/components/schemas/AdhocAgentConfigOverrideForTestRequestModel'
            - type: 'null'
          description: >-
            Configuration overrides to use for testing. If not provided, the
            agent's default configuration will be used.
        branch_id:
          type:
            - string
            - 'null'
          description: >-
            ID of the branch to run the tests on. If not provided, the tests
            will be run on the agent default configuration.
      required:
        - tests
    ConversationHistoryTranscriptCommonModelOutputRole:
      type: string
      enum:
        - value: user
        - value: agent
    AgentMetadata:
      type: object
      properties:
        agent_id:
          type: string
        branch_id:
          type:
            - string
            - 'null'
        workflow_node_id:
          type:
            - string
            - 'null'
      required:
        - agent_id
    ConversationHistoryMultivoiceMessagePartModel:
      type: object
      properties:
        text:
          type: string
        voice_label:
          type:
            - string
            - 'null'
        time_in_call_secs:
          type:
            - integer
            - 'null'
      required:
        - text
        - voice_label
        - time_in_call_secs
    ConversationHistoryMultivoiceMessageModel:
      type: object
      properties:
        parts:
          type: array
          items:
            $ref: '#/components/schemas/ConversationHistoryMultivoiceMessagePartModel'
      required:
        - parts
    ToolType:
      type: string
      enum:
        - value: system
        - value: webhook
        - value: client
        - value: mcp
        - value: workflow
        - value: api_integration_webhook
        - value: api_integration_mcp
    ConversationHistoryTranscriptToolCallWebhookDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: webhook
        method:
          type: string
        url:
          type: string
        headers:
          type: object
          additionalProperties:
            type: string
        path_params:
          type: object
          additionalProperties:
            type: string
        query_params:
          type: object
          additionalProperties:
            type: string
        body:
          type:
            - string
            - 'null'
      required:
        - method
        - url
    ConversationHistoryTranscriptToolCallClientDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: client
        parameters:
          type: string
      required:
        - parameters
    ConversationHistoryTranscriptToolCallMCPDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: mcp
        mcp_server_id:
          type: string
        mcp_server_name:
          type: string
        integration_type:
          type: string
        parameters:
          type: object
          additionalProperties:
            type: string
        approval_policy:
          type: string
        requires_approval:
          type: boolean
          default: false
        mcp_tool_name:
          type: string
          default: ''
        mcp_tool_description:
          type: string
          default: ''
      required:
        - mcp_server_id
        - mcp_server_name
        - integration_type
        - approval_policy
    ConversationHistoryTranscriptToolCallApiIntegrationWebhookDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: api_integration_webhook
        integration_id:
          type: string
        credential_id:
          type: string
        integration_connection_id:
          type: string
        webhook_details:
          $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallWebhookDetails
      required:
        - integration_id
        - credential_id
        - integration_connection_id
        - webhook_details
    ConversationHistoryTranscriptToolCallCommonModelOutputToolDetails:
      oneOf:
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallWebhookDetails
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallClientDetails
        - $ref: '#/components/schemas/ConversationHistoryTranscriptToolCallMCPDetails'
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallApiIntegrationWebhookDetails
    ConversationHistoryTranscriptToolCallCommonModel-Output:
      type: object
      properties:
        type:
          oneOf:
            - $ref: '#/components/schemas/ToolType'
            - type: 'null'
        request_id:
          type: string
        tool_name:
          type: string
        params_as_json:
          type: string
        tool_has_been_called:
          type: boolean
        tool_details:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptToolCallCommonModelOutputToolDetails
            - type: 'null'
      required:
        - request_id
        - tool_name
        - params_as_json
        - tool_has_been_called
    DynamicVariableUpdateCommonModel:
      type: object
      properties:
        variable_name:
          type: string
        old_value:
          type:
            - string
            - 'null'
        new_value:
          type: string
        updated_at:
          type: number
          format: double
        tool_name:
          type: string
        tool_request_id:
          type: string
      required:
        - variable_name
        - old_value
        - new_value
        - updated_at
        - tool_name
        - tool_request_id
    ConversationHistoryTranscriptOtherToolsResultCommonModelType:
      type: string
      enum:
        - value: client
        - value: webhook
        - value: mcp
    ConversationHistoryTranscriptOtherToolsResultCommonModel:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptOtherToolsResultCommonModelType
            - type: 'null'
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
    EndCallToolResultModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: end_call_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type:
            - string
            - 'null'
        message:
          type:
            - string
            - 'null'
    LanguageDetectionToolResultModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: language_detection_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type:
            - string
            - 'null'
        language:
          type:
            - string
            - 'null'
    TransferToAgentToolResultSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_agent_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        from_agent:
          type: string
        to_agent:
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
        - from_agent
        - to_agent
        - condition
    TransferToAgentToolResultErrorModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_agent_error
        status:
          type: string
          enum:
            - type: stringLiteral
              value: error
        from_agent:
          type: string
        error:
          type: string
      required:
        - from_agent
        - error
    TransferToNumberResultTwilioSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number_twilio_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        transfer_number:
          type: string
        reason:
          type:
            - string
            - 'null'
        client_message:
          type:
            - string
            - 'null'
        agent_message:
          type: string
        conference_name:
          type: string
        note:
          type:
            - string
            - 'null'
      required:
        - transfer_number
        - agent_message
        - conference_name
    TransferToNumberResultSipSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number_sip_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        transfer_number:
          type: string
        reason:
          type:
            - string
            - 'null'
        note:
          type:
            - string
            - 'null'
      required:
        - transfer_number
    TransferToNumberResultErrorModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number_error
        status:
          type: string
          enum:
            - type: stringLiteral
              value: error
        error:
          type: string
        details:
          type:
            - string
            - 'null'
      required:
        - error
    SkipTurnToolResponseModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: skip_turn_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type:
            - string
            - 'null'
    PlayDTMFResultSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: play_dtmf_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        dtmf_tones:
          type: string
        reason:
          type:
            - string
            - 'null'
      required:
        - dtmf_tones
    PlayDTMFResultErrorModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: play_dtmf_error
        status:
          type: string
          enum:
            - type: stringLiteral
              value: error
        error:
          type: string
        details:
          type:
            - string
            - 'null'
      required:
        - error
    VoiceMailDetectionResultSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: voicemail_detection_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        voicemail_message:
          type:
            - string
            - 'null'
        reason:
          type:
            - string
            - 'null'
    TestToolResultModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: testing_tool_result
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type: string
          default: Skipping tool call in test mode
    ConversationHistoryTranscriptSystemToolResultCommonModelResult:
      oneOf:
        - $ref: '#/components/schemas/EndCallToolResultModel'
        - $ref: '#/components/schemas/LanguageDetectionToolResultModel'
        - $ref: '#/components/schemas/TransferToAgentToolResultSuccessModel'
        - $ref: '#/components/schemas/TransferToAgentToolResultErrorModel'
        - $ref: '#/components/schemas/TransferToNumberResultTwilioSuccessModel'
        - $ref: '#/components/schemas/TransferToNumberResultSipSuccessModel'
        - $ref: '#/components/schemas/TransferToNumberResultErrorModel'
        - $ref: '#/components/schemas/SkipTurnToolResponseModel'
        - $ref: '#/components/schemas/PlayDTMFResultSuccessModel'
        - $ref: '#/components/schemas/PlayDTMFResultErrorModel'
        - $ref: '#/components/schemas/VoiceMailDetectionResultSuccessModel'
        - $ref: '#/components/schemas/TestToolResultModel'
    ConversationHistoryTranscriptSystemToolResultCommonModel:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: system
        result:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptSystemToolResultCommonModelResult
            - type: 'null'
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
        - type
    ConversationHistoryTranscriptApiIntegrationWebhookToolsResultCommonModel:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: api_integration_webhook
        integration_id:
          type: string
        credential_id:
          type: string
        integration_connection_id:
          type: string
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
        - type
        - integration_id
        - credential_id
        - integration_connection_id
    WorkflowToolEdgeStepModel:
      type: object
      properties:
        step_latency_secs:
          type: number
          format: double
        type:
          type: string
          enum:
            - type: stringLiteral
              value: edge
        edge_id:
          type: string
        target_node_id:
          type: string
      required:
        - step_latency_secs
        - edge_id
        - target_node_id
    WorkflowToolNestedToolsStepModelOutputResultsItems:
      oneOf:
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptOtherToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptSystemToolResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptApiIntegrationWebhookToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptWorkflowToolsResultCommonModel-Output
    WorkflowToolNestedToolsStepModel-Output:
      type: object
      properties:
        step_latency_secs:
          type: number
          format: double
        type:
          type: string
          enum:
            - type: stringLiteral
              value: nested_tools
        node_id:
          type: string
        requests:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptToolCallCommonModel-Output
        results:
          type: array
          items:
            $ref: >-
              #/components/schemas/WorkflowToolNestedToolsStepModelOutputResultsItems
        is_successful:
          type: boolean
      required:
        - step_latency_secs
        - node_id
        - requests
        - results
        - is_successful
    WorkflowToolMaxIterationsExceededStepModel:
      type: object
      properties:
        step_latency_secs:
          type: number
          format: double
        type:
          type: string
          enum:
            - type: stringLiteral
              value: max_iterations_exceeded
        max_iterations:
          type: integer
      required:
        - step_latency_secs
        - max_iterations
    WorkflowToolResponseModelOutputStepsItems:
      oneOf:
        - $ref: '#/components/schemas/WorkflowToolEdgeStepModel'
        - $ref: '#/components/schemas/WorkflowToolNestedToolsStepModel-Output'
        - $ref: '#/components/schemas/WorkflowToolMaxIterationsExceededStepModel'
    WorkflowToolResponseModel-Output:
      type: object
      properties:
        steps:
          type: array
          items:
            $ref: '#/components/schemas/WorkflowToolResponseModelOutputStepsItems'
    ConversationHistoryTranscriptWorkflowToolsResultCommonModel-Output:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: workflow
        result:
          oneOf:
            - $ref: '#/components/schemas/WorkflowToolResponseModel-Output'
            - type: 'null'
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
        - type
    ConversationHistoryTranscriptCommonModelOutputToolResultsItems:
      oneOf:
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptOtherToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptSystemToolResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptApiIntegrationWebhookToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptWorkflowToolsResultCommonModel-Output
    UserFeedbackScore:
      type: string
      enum:
        - value: like
        - value: dislike
    UserFeedback:
      type: object
      properties:
        score:
          $ref: '#/components/schemas/UserFeedbackScore'
        time_in_call_secs:
          type: integer
      required:
        - score
        - time_in_call_secs
    MetricRecord:
      type: object
      properties:
        elapsed_time:
          type: number
          format: double
      required:
        - elapsed_time
    ConversationTurnMetrics:
      type: object
      properties:
        metrics:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/MetricRecord'
    RagChunkMetadata:
      type: object
      properties:
        document_id:
          type: string
        chunk_id:
          type: string
        vector_distance:
          type: number
          format: double
      required:
        - document_id
        - chunk_id
        - vector_distance
    RagRetrievalInfo:
      type: object
      properties:
        chunks:
          type: array
          items:
            $ref: '#/components/schemas/RagChunkMetadata'
        embedding_model:
          $ref: '#/components/schemas/EmbeddingModelEnum'
        retrieval_query:
          type: string
        rag_latency_secs:
          type: number
          format: double
      required:
        - chunks
        - embedding_model
        - retrieval_query
        - rag_latency_secs
    LLMTokensCategoryUsage:
      type: object
      properties:
        tokens:
          type: integer
          default: 0
        price:
          type: number
          format: double
          default: 0
    LLMInputOutputTokensUsage:
      type: object
      properties:
        input:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
        input_cache_read:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
        input_cache_write:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
        output_total:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
    LLMUsage-Output:
      type: object
      properties:
        model_usage:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LLMInputOutputTokensUsage'
    ConversationHistoryTranscriptCommonModelOutputSourceMedium:
      type: string
      enum:
        - value: audio
        - value: text
    ConversationHistoryTranscriptCommonModel-Output:
      type: object
      properties:
        role:
          $ref: >-
            #/components/schemas/ConversationHistoryTranscriptCommonModelOutputRole
        agent_metadata:
          oneOf:
            - $ref: '#/components/schemas/AgentMetadata'
            - type: 'null'
        message:
          type:
            - string
            - 'null'
        multivoice_message:
          oneOf:
            - $ref: '#/components/schemas/ConversationHistoryMultivoiceMessageModel'
            - type: 'null'
        tool_calls:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptToolCallCommonModel-Output
        tool_results:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptCommonModelOutputToolResultsItems
        feedback:
          oneOf:
            - $ref: '#/components/schemas/UserFeedback'
            - type: 'null'
        llm_override:
          type:
            - string
            - 'null'
        time_in_call_secs:
          type: integer
        conversation_turn_metrics:
          oneOf:
            - $ref: '#/components/schemas/ConversationTurnMetrics'
            - type: 'null'
        rag_retrieval_info:
          oneOf:
            - $ref: '#/components/schemas/RagRetrievalInfo'
            - type: 'null'
        llm_usage:
          oneOf:
            - $ref: '#/components/schemas/LLMUsage-Output'
            - type: 'null'
        interrupted:
          type: boolean
          default: false
        original_message:
          type:
            - string
            - 'null'
        source_medium:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptCommonModelOutputSourceMedium
            - type: 'null'
      required:
        - role
        - time_in_call_secs
    AgentSuccessfulResponseExample:
      type: object
      properties:
        response:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: success
      required:
        - response
        - type
    AgentFailureResponseExample:
      type: object
      properties:
        response:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: failure
      required:
        - response
        - type
    LLMParameterEvaluationStrategy:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: llm
        description:
          type: string
          description: A description of the evaluation strategy to use for the test.
      required:
        - type
        - description
    RegexParameterEvaluationStrategy:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: regex
        pattern:
          type: string
          description: A regex pattern to match the agent's response against.
      required:
        - type
        - pattern
    ExactParameterEvaluationStrategy:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: exact
        expected_value:
          type: string
          description: The exact string value that the parameter must match.
      required:
        - type
        - expected_value
    MatchAnythingParameterEvaluationStrategy:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: anything
      required:
        - type
    UnitTestToolCallParameterEval:
      oneOf:
        - $ref: '#/components/schemas/LLMParameterEvaluationStrategy'
        - $ref: '#/components/schemas/RegexParameterEvaluationStrategy'
        - $ref: '#/components/schemas/ExactParameterEvaluationStrategy'
        - $ref: '#/components/schemas/MatchAnythingParameterEvaluationStrategy'
    UnitTestToolCallParameter:
      type: object
      properties:
        eval:
          $ref: '#/components/schemas/UnitTestToolCallParameterEval'
        path:
          type: string
      required:
        - eval
        - path
    ReferencedToolCommonModelType:
      type: string
      enum:
        - value: system
        - value: webhook
        - value: client
        - value: workflow
        - value: api_integration_webhook
    ReferencedToolCommonModel:
      type: object
      properties:
        id:
          type: string
          description: The ID of the tool
        type:
          $ref: '#/components/schemas/ReferencedToolCommonModelType'
          description: The type of the tool
      required:
        - id
        - type
    UnitTestToolCallEvaluationModel-Output:
      type: object
      properties:
        parameters:
          type: array
          items:
            $ref: '#/components/schemas/UnitTestToolCallParameter'
          description: >-
            Parameters to evaluate for the agent's tool call. If empty, the tool
            call parameters are not evaluated.
        referenced_tool:
          oneOf:
            - $ref: '#/components/schemas/ReferencedToolCommonModel'
            - type: 'null'
          description: The tool to evaluate a call against.
        verify_absence:
          type: boolean
          default: false
          description: Whether to verify that the tool was NOT called.
    UnitTestCommonModelDynamicVariables:
      oneOf:
        - type: string
        - type: number
          format: double
        - type: integer
        - type: boolean
    UnitTestCommonModelType:
      type: string
      enum:
        - value: llm
        - value: tool
    TestFromConversationMetadata-Output:
      type: object
      properties:
        conversation_id:
          type: string
        agent_id:
          type: string
        workflow_node_id:
          type:
            - string
            - 'null'
        original_agent_reply:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptCommonModel-Output
      required:
        - conversation_id
        - agent_id
    UnitTestCommonModel:
      type: object
      properties:
        chat_history:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptCommonModel-Output
        success_condition:
          type: string
          description: >-
            A prompt that evaluates whether the agent's response is successful.
            Should return True or False.
        success_examples:
          type: array
          items:
            $ref: '#/components/schemas/AgentSuccessfulResponseExample'
          description: >-
            Non-empty list of example responses that should be considered
            successful
        failure_examples:
          type: array
          items:
            $ref: '#/components/schemas/AgentFailureResponseExample'
          description: >-
            Non-empty list of example responses that should be considered
            failures
        tool_call_parameters:
          oneOf:
            - $ref: '#/components/schemas/UnitTestToolCallEvaluationModel-Output'
            - type: 'null'
          description: >-
            How to evaluate the agent's tool call (if any). If empty, the tool
            call is not evaluated.
        dynamic_variables:
          type: object
          additionalProperties:
            oneOf:
              - $ref: '#/components/schemas/UnitTestCommonModelDynamicVariables'
              - type: 'null'
          description: Dynamic variables to replace in the agent config during testing
        type:
          $ref: '#/components/schemas/UnitTestCommonModelType'
        from_conversation_metadata:
          oneOf:
            - $ref: '#/components/schemas/TestFromConversationMetadata-Output'
            - type: 'null'
          description: >-
            Metadata of a conversation this test was created from (if
            applicable).
      required:
        - chat_history
        - success_condition
        - success_examples
        - failure_examples
    TestRunStatus:
      type: string
      enum:
        - value: pending
        - value: passed
        - value: failed
    EvaluationSuccessResult:
      type: string
      enum:
        - value: success
        - value: failure
        - value: unknown
    TestConditionRationaleCommonModel:
      type: object
      properties:
        messages:
          type: array
          items:
            type: string
          description: List of individual parameter evaluation messages or reasons
        summary:
          type: string
          default: ''
          description: High-level summary of the evaluation result
    TestConditionResultCommonModel:
      type: object
      properties:
        result:
          $ref: '#/components/schemas/EvaluationSuccessResult'
        rationale:
          oneOf:
            - $ref: '#/components/schemas/TestConditionRationaleCommonModel'
            - type: 'null'
      required:
        - result
    TestRunMetadataTestType:
      type: string
      enum:
        - value: llm
        - value: tool_call
      default: llm
    TestRunMetadata:
      type: object
      properties:
        workspace_id:
          type: string
        test_name:
          type: string
        ran_by_user_email:
          type: string
        test_type:
          $ref: '#/components/schemas/TestRunMetadataTestType'
      required:
        - workspace_id
        - test_name
        - ran_by_user_email
    UnitTestRunResponseModel:
      type: object
      properties:
        test_run_id:
          type: string
        test_info:
          oneOf:
            - $ref: '#/components/schemas/UnitTestCommonModel'
            - type: 'null'
        test_invocation_id:
          type: string
        agent_id:
          type: string
        branch_id:
          type:
            - string
            - 'null'
        workflow_node_id:
          type:
            - string
            - 'null'
        status:
          $ref: '#/components/schemas/TestRunStatus'
        agent_responses:
          type:
            - array
            - 'null'
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptCommonModel-Output
        test_id:
          type: string
        test_name:
          type: string
          default: Unknown Test
        condition_result:
          oneOf:
            - $ref: '#/components/schemas/TestConditionResultCommonModel'
            - type: 'null'
        last_updated_at_unix:
          type: integer
        metadata:
          oneOf:
            - $ref: '#/components/schemas/TestRunMetadata'
            - type: 'null'
      required:
        - test_run_id
        - test_invocation_id
        - agent_id
        - status
        - test_id
    GetTestSuiteInvocationResponseModel:
      type: object
      properties:
        id:
          type: string
        agent_id:
          type:
            - string
            - 'null'
        branch_id:
          type:
            - string
            - 'null'
        created_at:
          type: integer
        test_runs:
          type: array
          items:
            $ref: '#/components/schemas/UnitTestRunResponseModel'
      required:
        - id
        - test_runs

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.agents.runTests("agent_id", {
        tests: [
            {
                testId: "string",
            },
        ],
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.agents.run_tests(
    agent_id="agent_id",
    tests=[
        {
            "test_id": "string"
        }
    ]
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

	url := "https://api.elevenlabs.io/v1/convai/agents/agent_id/run-tests"

	payload := strings.NewReader("{\n  \"tests\": [\n    {\n      \"test_id\": \"string\"\n    }\n  ]\n}")

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

url = URI("https://api.elevenlabs.io/v1/convai/agents/agent_id/run-tests")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"tests\": [\n    {\n      \"test_id\": \"string\"\n    }\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/convai/agents/agent_id/run-tests")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"tests\": [\n    {\n      \"test_id\": \"string\"\n    }\n  ]\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/convai/agents/agent_id/run-tests', [
  'body' => '{
  "tests": [
    {
      "test_id": "string"
    }
  ]
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/agents/agent_id/run-tests");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"tests\": [\n    {\n      \"test_id\": \"string\"\n    }\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = ["tests": [["test_id": "string"]]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/agents/agent_id/run-tests")! as URL,
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